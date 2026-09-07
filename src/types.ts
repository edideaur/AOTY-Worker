export interface AlbumBlock {
  url: string;
  artist: string;
  title: string;
  cover: string;
  mediaType: string;
  releaseDate: string;
  criticScore: string | null;
  criticCount: string | null;
  userScore: string | null;
  userCount: string | null;
  mustHear: boolean;
}

export interface Track {
  number: string;
  title: string;
  url: string;
  length: string;
  rating: string | null;
  ratingCount: number | null;
  notes: string | null;
  features: string[];
}

export interface CriticReview {
  score: string;
  publication: string;
  author: string;
  text: string;
  image: string;
  url: string;
  date: string;
}

export interface StreamingLink {
  platform: string;
  url: string;
}

export interface AlbumStats {
  favorites: number | null;
  likes: number | null;
  listens: number | null;
  libraryCount: number | null;
  lists: number | null;
}

export interface AlbumRatingMilestone {
  milestone: string;
  date: string | null;
  score: string;
  exactScore: string | null;
}

export interface AlbumRatingHistory {
  albumId: string;
  headline: string;
  milestones: AlbumRatingMilestone[];
}

export interface AlbumDistributionRow {
  label: string;
  count: number;
  percentage: string | null;
}

export interface AlbumDistribution {
  albumId: string;
  format: string;
  rows: AlbumDistributionRow[];
}

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type DeepReadonly<T> = T extends (infer R)[]
  ? readonly DeepReadonly<R>[]
  : T extends (...args: unknown[]) => unknown
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type AlbumId = Brand<string, "AlbumId">;
export type ArtistId = Brand<string, "ArtistId">;
export type UserId = Brand<string, "UserId">;

export function assertNever(x: never, message = "Unexpected unreachable value"): never {
  throw new Error(`${message}: ${String(x)}`);
}

export interface ReviewGuidelinesSection {
  type: "review";
  title: string;
  bestPractices: string[];
  whatToAvoid: string[];
  footnote: string | null;
}

export interface CommentGuidelinesSection {
  type: "comment";
  title: string;
  sections: { title: string; text: string }[];
}

export type GuidelinesSection = ReviewGuidelinesSection | CommentGuidelinesSection;

export interface CreditEntry {
  name: string;
  url: string;
  image: string | null;
  roles: string[];
}

export interface CreditSection {
  title: string;
  credits: CreditEntry[];
}

export interface AlbumUserListPreview {
  url: string;
  title: string;
  username: string;
  userUrl: string;
  avatar: string | null;
}

export interface AlbumDetail {
  url: string;
  id: string;
  title: string;
  artist: string;
  artistUrl: string;
  cover: string;
  datePublished: string;
  format: string;
  label: string | null;
  labelUrl: string | null;
  labels: NamedLink[];
  genres: string[];
  tags: string[];
  vibes: string[];
  producers: NamedLink[];
  writers: NamedLink[];
  totalLength: string | null;
  criticScore: string | null;
  criticScoreExact: string | null;
  criticCount: string | null;
  userScore: string | null;
  userScoreExact: string | null;
  userCount: string | null;
  tracklist: Track[];
  streamingLinks: StreamingLink[];
  reviews: CriticReview[];
  popularUserReviews: UserReview[];
  recentUserReviews: UserReview[];
  moreAlbums: AlbumBlock[];
  similarAlbums: AlbumBlock[];
  contributionsBy: NamedLink[];
  yearEndLists: CriticListRank[];
  userLists: AlbumUserListPreview[];
  comments: AotyComment[];
  stats: AlbumStats | null;
  credits: CreditSection[] | null;
}

export interface NewsItem {
  id: string;
  url: string;
  title: string;
  image: string | null;
  source: string;
  sourceUrl: string;
  date: string;
  likes: string;
  comments: string;
}

export interface ListEntry {
  url: string;
  title: string;
  publication: string;
  cover: string | null;
}

export interface ListDetailItem {
  rank: string;
  artist: string;
  album: string;
  title: string;
  url: string;
  cover: string;
  date: string;
  genres: string[];
  score: string | null;
  scoreExact: string | null;
  ratingCount: string | null;
  blurb: string | null;
  otherLists: number | null;
}

export interface SearchArtist {
  url: string;
  name: string;
  image: string | null;
}

export interface SearchLabel {
  url: string;
  name: string;
  description: string | null;
}

export interface NamedLink {
  name: string;
  url: string;
}

export interface DiscographySection {
  title: string;
  albums: AlbumBlock[];
}

export interface ArtistDetail {
  url: string;
  name: string;
  image: string | null;
  criticScore: string | null;
  criticCount: string | null;
  userScore: string | null;
  userCount: string | null;
  followers: string | null;
  genres: NamedLink[];
  alsoKnownAs: string[];
  members: NamedLink[];
  formerMembers: NamedLink[];
  memberOf: NamedLink[];
  formerlyOf: NamedLink[];
  relatedArtists: NamedLink[];
  tags: NamedLink[];
  website: string | null;
  sections: DiscographySection[];
  topSongs: TopSong[];
  similarArtists: SearchArtist[];
}

export interface LabelDetail {
  url: string;
  name: string;
  image: string | null;
  website: string | null;
  parentLabel: NamedLink | null;
  description: string | null;
  page: number;
  albums: AlbumBlock[];
}

export interface GenreSection {
  title: string;
  url: string | null;
  albums: AlbumBlock[];
  artists: SearchArtist[];
}

export interface GenreDetail {
  url: string;
  slug: string;
  name: string;
  page: number;
  sections: GenreSection[];
  items: ChartItem[];
  childGenres: NamedLink[];
}

export interface ChartItem {
  rank: string;
  artist: string;
  album: string;
  title: string;
  url: string;
  cover: string | null;
  date: string | null;
  genres: string[];
  score: string | null;
  scoreExact: string | null;
  ratingCount: string | null;
  mustHear: boolean;
}

export interface GenreIndexItem {
  name: string;
  url: string;
  albums: AlbumBlock[];
}

export interface TagResults {
  tag: string;
  type: string;
  year: string | null;
  page: number;
  albums: AlbumBlock[];
  media: NewsItem[];
}

export interface PublicationReview {
  album: string;
  albumUrl: string;
  artist: string;
  artistUrl: string;
  cover: string | null;
  score: string;
  reviewUrl: string;
}

export interface PublicationDetail {
  url: string;
  slug: string;
  name: string;
  image: string | null;
  website: string | null;
  albumsRated: string | null;
  averageRating: string | null;
  ratingDistribution: { range: string; count: number }[];
  recentReviews: PublicationReview[];
  topAlbums: PublicationReview[];
}

export interface CriticReviewEntry {
  album: string;
  albumUrl: string;
  artist: string;
  artistUrl: string;
  cover: string | null;
  score: string;
  text: string;
  publication: string;
  publicationUrl: string;
  date: string | null;
}

export interface CriticDetail {
  url: string;
  slug: string;
  name: string;
  publication: string | null;
  publicationUrl: string | null;
  page: number;
  reviews: CriticReviewEntry[];
}

export interface SongCredit {
  role: string;
  artists: NamedLink[];
}

export interface SongRating {
  username: string;
  userUrl: string;
  avatar: string | null;
  rating: string;
  date: string | null;
}

export interface SongDetail {
  url: string;
  id: string;
  title: string;
  artist: string;
  artistUrl: string;
  cover: string | null;
  album: string | null;
  albumUrl: string | null;
  trackNumber: string | null;
  year: string | null;
  duration: string | null;
  userScore: string | null;
  userScoreExact: string | null;
  ratingCount: string | null;
  ratingDistribution: Array<{ label: string; count: number }>;
  tags: NamedLink[];
  credits: SongCredit[];
  topRatings: SongRating[];
  comments: AotyComment[];
}

export interface TopSong {
  rank: string;
  title: string;
  url: string;
  artist: string;
  artistUrl: string;
  album: string | null;
  albumUrl: string | null;
  cover: string | null;
  score: string | null;
  ratingCount: string | null;
}

export interface UserProfile {
  url: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  links: NamedLink[];
  subscriber: boolean;
  ratingDistribution: Array<{ label: string; count: number }>;
  favorites: AlbumBlock[];
  stats: {
    ratings: string;
    reviews: string;
    lists: string;
    followers: string;
    following: string;
  };
}

export interface UserRating extends AlbumBlock {
  userRating: string | null;
  ratedDate: string | null;
  reviewUrl: string | null;
}

export interface UserReview {
  url: string;
  artist: string;
  artistUrl: string;
  album: string;
  albumUrl: string;
  cover: string | null;
  username: string;
  userUrl: string;
  avatar: string | null;
  rating: string | null;
  text: string;
  likes: string;
  comments: string;
  date: string | null;
}

export interface UserReviewDetail extends UserReview {
  albumId: string | null;
  trackRatings: TrackRating[];
}

export interface AotyComment {
  id: string;
  username: string;
  userUrl: string;
  avatar: string | null;
  date: string;
  dateExact: string;
  text: string;
  replies: string;
}

export interface UserListEntry {
  url: string;
  title: string;
  username: string;
  userUrl: string;
  avatar: string | null;
  covers: string[];
  description: string | null;
  likes: string | null;
  comments: string | null;
}

export interface UserListDetailItem {
  rank: string;
  artist: string;
  artistUrl: string;
  title: string;
  url: string;
  cover: string | null;
  year: string | null;
}

export interface TrackRating {
  number: string | null;
  title: string;
  url: string;
  rating: string | null;
}

export interface UserListDetail {
  url: string;
  title: string;
  username: string | null;
  description: string | null;
  items: UserListDetailItem[];
  comments: AotyComment[];
}

export interface CriticListRank {
  url: string;
  title: string;
  publication: string;
  publicationUrl: string | null;
  cover: string | null;
  rank: string | null;
}

export interface PerfectSection {
  title: string;
  reviews: PublicationReview[];
}

export interface ArtistsOverviewSection {
  title: string;
  artists: SearchArtist[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ChangelogEntry {
  date: string;
  type: string;
  title: string;
  text: string;
}

export interface SingleStat {
  name: string;
  value: string;
}

export interface LeaderboardItem {
  name: string;
  value: string;
}

export interface LeaderboardModule {
  title: string;
  key: string | null;
  timestamp: string | null;
  items: LeaderboardItem[];
}

export interface SiteStats {
  totals: SingleStat[];
  leaderboards: LeaderboardModule[];
}

export interface TagItem {
  name: string;
  url: string;
}

export interface UserTagEntry {
  tag: string;
  url: string;
  count: string;
}

export interface NewsSearchItem {
  title: string;
  url: string;
  source: string | null;
  image: string | null;
}

export interface NewsDetail {
  url: string;
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  date: string;
  image: string | null;
  text: string;
  likes: string;
  embedUrl: string | null;
  related: NamedLink[];
  streamingLinks: StreamingLink[];
  comments: AotyComment[];
}

export interface SiteUpdate {
  kind: string;
  title: string;
  url: string;
  artist: string | null;
  artistUrl: string | null;
  image: string | null;
  meta: string | null;
  timeAgo: string | null;
}

export interface LabelAutocompleteItem {
  value: string;
  link: string;
  description?: string | null;
}

export interface SearchAutocompleteItem {
  value: string;
  label?: string;
  link?: string;
  type?: string;
  image?: string | null;
}

export interface UserGenreItem {
  name: string;
  url: string;
  count: number | null;
  percentage: string | null;
  averageScore: string | null;
}

export interface UserBadgeItem {
  name: string;
  description: string | null;
  image: string | null;
  date: string | null;
}

export interface RssFeedItem {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
}

export interface RssFeed {
  title: string;
  link: string;
  description: string | null;
  items: RssFeedItem[];
}

