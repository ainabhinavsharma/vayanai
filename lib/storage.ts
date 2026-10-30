import { TripBrief, SavedTrip } from '@/types';

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('vayanai-storage-update'));
      return true;
    } catch {
      return false;
    }
  },
  getLastBrief(): TripBrief {
    return this.get<TripBrief>('vayanai.lastBrief', {
      origin: 'Mumbai',
      when: 'Flexible for now',
      party: 'Two of us',
      duration: 'About 5 days',
      budget: '₹45–75k',
      interests: ['Nature'],
      accessibility: [],
      routeKey: 'meghalaya'
    });
  },
  saveBrief(brief: TripBrief) {
    this.set('vayanai.lastBrief', brief);
  },
  getSavedTrips(): SavedTrip[] {
    return this.get<SavedTrip[]>('vayanai.savedTrips', []);
  },
  toggleSaveTrip(trip: Omit<SavedTrip, 'updated'>): { saved: boolean; trips: SavedTrip[] } {
    let trips = this.getSavedTrips();
    const exists = trips.some(t => t.id === trip.id);
    if (exists) {
      trips = trips.filter(t => t.id !== trip.id);
      this.set('vayanai.savedTrips', trips);
      return { saved: false, trips };
    } else {
      const newTrip: SavedTrip = {
        ...trip,
        updated: new Date().toISOString()
      };
      trips = [newTrip, ...trips];
      this.set('vayanai.savedTrips', trips);
      return { saved: true, trips };
    }
  },
  removeTrip(id: string): SavedTrip[] {
    let trips = this.getSavedTrips().filter(t => t.id !== id);
    this.set('vayanai.savedTrips', trips);
    return trips;
  }
};
