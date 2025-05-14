// src/app/resolvers/text-channel.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApiService } from '@shared/api/api.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Channel {
  id: string;
  name: string;
  channel_type: 'TEXT' | 'AUDIO';
}

@Injectable({
  providedIn: 'root'
})
export class TextChannelResolver implements Resolve<Channel | null> {
  constructor(private apiService: ApiService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Channel | null> {
    const serverId = route.paramMap.get('serverId');

    if (!serverId) return of(null);

    return this.apiService.getServerChannels(serverId).pipe(
      map((channels: Channel[]) => {
        const textChannel = channels.find(c => c.channel_type === 'TEXT');
        return textChannel || null;
      }),
      catchError(() => of(null))
    );
  }
}
