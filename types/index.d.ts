// types/index.d.ts

export interface Anime {
    id: number;
    title: {
      romaji: string;
      english: string | null;
      native: string | null;
    };
    format: string;
    status: string;
    season: string;
    seasonYear: number;
    episodes: number;
    duration: number;
    genres: string[];
    averageScore: number;
    popularity: number;
    description: string;
    startDate: string | null;
    endDate: string | null;
    releaseDate: string;
    episodesList: AnimeEpisode[] | null;
    [key: string]: unknown;
  }
  
  export interface AnimeEpisode {
    id: string;
    number: number;
    title: string | null;
    description: string | null;
    airedAt: string | null;
  }
