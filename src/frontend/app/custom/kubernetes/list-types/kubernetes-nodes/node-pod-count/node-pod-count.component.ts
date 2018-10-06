import { Component, OnInit } from '@angular/core';
import { TableCellCustom } from '../../../../../shared/components/list/list.types';
import { KubernetesNode } from '../../../store/kube.types';
import { KubernetesEndpointService } from '../../../services/kubernetes-endpoint.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-node-pod-count',
  templateUrl: './node-pod-count.component.html',
  styleUrls: ['./node-pod-count.component.scss']
})
export class NodePodCountComponent extends TableCellCustom<KubernetesNode> implements OnInit {
  podCount$: any;

  constructor(
    private kubeEndpointService: KubernetesEndpointService
  ) {
    super();
  }

  ngOnInit() {

    this.podCount$ = this.kubeEndpointService.pods$.pipe(
      map(pods =>  pods.filter(p => p.spec.nodeName === this.row.metadata.name)),
      map(p => p.length)
    );
  }

}
