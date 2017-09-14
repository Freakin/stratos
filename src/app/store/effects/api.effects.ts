import { normalize } from 'normalizr';
import { CNSISModel } from './../reducers/cnsis.reducer';
import { environment } from './../../../environments/environment';
import { AppState } from './../app-state';
import { APIAction, ApiActionTypes, StartAPIAction, WrapperAPIActionSuccess, WrapperAPIActionFailed } from './../actions/api.actions';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions, RequestOptionsArgs, Request, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Action, Store } from '@ngrx/store';
import { Actions, Effect } from '@ngrx/effects';

const { proxyAPIVersion, cfAPIVersion } = environment;
@Injectable()
export class APIEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) { }

  @Effect() apiRequestStart$ = this.actions$.ofType<APIAction>(ApiActionTypes.API_REQUEST)
    .map(apiAction => {
      return new StartAPIAction(apiAction);
    });

  @Effect() apiRequest$ = this.actions$.ofType<StartAPIAction>(ApiActionTypes.API_REQUEST_START)
    .withLatestFrom(this.store)
    .switchMap(([action, state]) => {
      const { apiAction } = action;
      this.store.dispatch(this.getActionFromString(apiAction.actions[0]));

      apiAction.options.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${apiAction.options.url}`;
      apiAction.options.headers = this.addBaseHeaders(apiAction.cnis || state.cnsis.entities, apiAction.options.headers);

      return this.http.request(new Request(apiAction.options))
        .mergeMap(response => {
          const entities = this.getEntities(apiAction, response);
          return [new WrapperAPIActionSuccess(apiAction.actions[1], entities, apiAction.entityKey, apiAction.paginationKey)];
        })
        .catch(err => {
          return [new WrapperAPIActionFailed(apiAction.actions[2], err, apiAction.entityKey, apiAction.paginationKey)];
        });
    });

  getEntities(apiAction: APIAction, response: Response) {
    const data = response.json();
    // Only one entity
    if (apiAction.cnis) {
      return normalize(Object.keys(data).map(key => data[key]), apiAction.entity);
    }

    const allEntities = Object.keys(data).map(cfGuid => {
      const cfData = data[cfGuid];
      if (cfData.resources) {
        if (!cfData.resources.length) {
          return null;
        }
        return cfData.resources.map(({ entity, metadata }) => {
          return this.mergeData(entity, metadata, cfGuid);
        });
      } else {
        return this.mergeData(cfData.entity, cfData.metadata, cfGuid);
      }
    });
    const flatEntities = [].concat(...allEntities).filter(e => !!e);
    return flatEntities.length ? normalize(flatEntities, apiAction.entity) : {};
  }

  mergeData(entity, metadata, cfGuid) {
    return { ...entity, ...metadata, cfGuid };
  }

  getDataFromResponse(response: Response) {
    response.json();
  }

  addBaseHeaders(cnsis: CNSISModel[] | string, header: Headers): Headers {
    const cnsiHeader = 'x-cap-cnsi-list';
    const headers = new Headers();
    if (typeof cnsis === 'string') {
      headers.set(cnsiHeader, cnsis);
    } else {
      headers.set(cnsiHeader, cnsis.filter(c => c.registered).map(c => c.guid));
    }
    return headers;
  }

  getActionFromString(type: string) {
    return { type };
  }

}
