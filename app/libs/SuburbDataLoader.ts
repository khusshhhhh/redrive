interface SuburbData {
  suburb: string;
  state: string;
  postcode: number;
  lat: number;
  lng: number;
}

class SuburbDataLoader {
  private static instance: SuburbDataLoader;
  private data: SuburbData[] | null = null;
  private loadingPromise: Promise<SuburbData[]> | null = null;

  private constructor() {}

  static getInstance(): SuburbDataLoader {
    if (!SuburbDataLoader.instance) {
      SuburbDataLoader.instance = new SuburbDataLoader();
    }
    return SuburbDataLoader.instance;
  }

  async loadData(): Promise<SuburbData[]> {
    // Return cached data if available
    if (this.data) {
      return this.data;
    }

    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading data
    this.loadingPromise = this.fetchData();
    
    try {
      this.data = await this.loadingPromise;
      return this.data;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async fetchData(): Promise<SuburbData[]> {
    const response = await fetch("/test.Suburb.json");
    if (!response.ok) {
      throw new Error(`Failed to load suburb data: ${response.statusText}`);
    }
    return response.json();
  }

  getSuburbsByState(state: string): { value: string; label: string; postcode?: number }[] {
    if (!this.data) {
      return [];
    }

    return this.data
      .filter((suburb) => suburb.state === state)
      .map((suburb) => ({
        value: suburb.suburb,
        label: `${suburb.suburb}, ${suburb.postcode}`,
        postcode: suburb.postcode,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  findSuburbCoordinates(suburb: string, state: string): { lat: number; lng: number } | null {
    if (!this.data) {
      return null;
    }

    const foundSuburb = this.data.find(
      (s) => s.suburb === suburb && s.state === state
    );
    
    return foundSuburb ? { lat: foundSuburb.lat, lng: foundSuburb.lng } : null;
  }

  // Preload data for better performance
  preload(): void {
    this.loadData().catch(console.error);
  }
}

export default SuburbDataLoader;