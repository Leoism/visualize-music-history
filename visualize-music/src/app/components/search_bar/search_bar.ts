import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MenuItem } from 'primeng/api';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { Menubar } from 'primeng/menubar';
import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces';
import { updateSelectedEntityType } from '../../store/actions/ui.actions';
import { selectProcessedData } from '../../store/selectors/data.selectors';

interface SearchSuggestion {
  key: EntityKey;
  type: EntityType;
  display: string;
  artist?: string;
}
@Component({
  selector: 'app-search-bar',
  templateUrl: './search_bar.ng.html',
  styleUrls: ['./search_bar.scss'],
  imports: [CommonModule, AutoComplete, FormsModule, Menubar, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SearchBarComponent {
  private readonly store = inject(Store);
  private readonly destoryRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private readonly processedData$ = this.store.select(selectProcessedData);

  menuItems: MenuItem[] = [
    {
      label: 'Artists',
      icon: 'pi pi-user',
      command: () => {
        this.store.dispatch(
          updateSelectedEntityType({ entityType: 'artists' })
        );
      },
    },
    {
      label: 'Tracks',
      icon: 'pi pi-headphones',
      command: () => {
        this.store.dispatch(updateSelectedEntityType({ entityType: 'tracks' }));
      },
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: ['/settings'],
    },
  ];
  filteredItems: SearchSuggestion[] = [];
  items: SearchSuggestion[] = [];
  selectedItem: SearchSuggestion | undefined;

  constructor() {
    const sub = this.processedData$.subscribe((data) => {
      if (data) {
        this.items = [];
        data.artists.forEach((value, key) => {
          this.items.push({
            key,
            type: 'artists',
            display: value.details.artistName || key,
          });
        });
        data.tracks.forEach((value, key) => {
          this.items.push({
            key,
            type: 'tracks',
            display: value.details.trackName || key,
            artist: value.details.artistName || 'Unknown Artist',
          });
        });
      }
    });

    this.destoryRef.onDestroy(() => {
      sub.unsubscribe();
    });
  }

  handleSearchInput(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase().trim();
    if (query.length < 1) {
      this.filteredItems = [];
      return;
    }

    const allMatches = this.items.filter(
      (item) =>
        item.display.toLowerCase().includes(query) ||
        item.artist?.toLowerCase().includes(query)
    );

    // Sort results: Exact Match > Starts With > Artist Priority > Alphabetical
    allMatches.sort((a, b) => {
      const aLower = a.display.toLowerCase();
      const bLower = b.display.toLowerCase();
      const queryLower = query;

      // Priority checks
      const aIsExact = aLower === queryLower;
      const bIsExact = bLower === queryLower;
      const aStartsWith = aLower.startsWith(queryLower);
      const bStartsWith = bLower.startsWith(queryLower);

      if (aIsExact !== bIsExact) return aIsExact ? -1 : 1; // Exact matches first
      if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1; // StartsWith matches second

      // Slight bias for artist if neither starts with query
      if (!aStartsWith && !bStartsWith) {
        if (a.type === 'artists' && b.type === 'tracks') return -1;
        if (b.type === 'artists' && a.type === 'tracks') return 1;
      }

      return a.display.localeCompare(b.display); // Alphabetical fallback
    });

    this.filteredItems = allMatches;
  }

  onSelect(event: AutoCompleteSelectEvent) {
    const selection = event.value as SearchSuggestion;
    this.router.navigate(['/details', selection.type, selection.key]);
  }
}
