# AOTY API

Unofficial REST API for [albumoftheyear.org](https://www.albumoftheyear.org). Scrapes public pages and returns structured JSON. Built with Bun, TypeScript, and Cloudflare Workers.

<a href="https://www.postman.com/edideaur-8096189/aoty-api"><img src="https://run.pstmn.io/button.svg" height="32"/></a> <a href="https://aoty.prigoana.com"><img src="https://img.shields.io/badge/API-Docs-blue?style=for-the-badge" height="32"/></a>

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

## Tests

```bash
bun test
```

## Type check

```bash
bun run typecheck
```

## Deploy

```bash
bun run deploy
```

## API reference

Interactive docs are served at `/` via [Scalar](https://scalar.com). The raw OpenAPI 3.0.3 spec is at `/openapi.json`.

## Endpoints

| Method | Path | Params | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/` | | Scalar API reference UI |
| GET | `/openapi.json` | | OpenAPI 3.0.3 spec |
| GET | `/album` | `slug` or (`artist`, `name`), `minimal` | Full album detail |
| GET | `/album/similar` | `slug`, `page` | Albums similar to this album |
| GET | `/album/user-reviews` | `slug`, `sort` (popular, recent, worst), `page` | User reviews for an album |
| GET | `/album/comments` | `slug`, `page` | Comments on an album |
| GET | `/album/comments/replies` | `albumId`, `commentId` | Replies to an album comment |
| GET | `/album/critic-reviews` | `slug`, `sort` (highest, lowest, newest, oldest) | Critic reviews, sorted |
| GET | `/album/tags` | `slug` | Complete tag list for an album |
| GET | `/album/tags/autocomplete` | `q` | Album tag search / autocomplete |
| GET | `/random/album` | | Random album (never cached) |
| GET | `/album/rating-history` | `albumId` | Rating milestones score trend |
| GET | `/album/distribution` | `albumId`, `format` (all, following) | Rating score distribution histogram |
| GET | `/album/user-lists` | `slug`, `page` | User lists containing an album |
| GET | `/album/critic-lists` | `slug`, `page` | Year-end critic lists ranking an album |
| GET | `/artist` | `slug`, `type`, `sort`, `page` | Artist details + discography |
| GET | `/artist/similar` | `slug`, `page` | Similar artists |
| GET | `/artist/songs` | `slug`, `page` | Community's top songs by artist |
| GET | `/artist/news` | `slug`, `type`, `page` | News about an artist |
| GET | `/artist/credits` | `slug`, `role`, `sort` | Credited albums (omit `role` to list roles) |
| GET | `/artists` | | Artists overview |
| GET | `/random/artist` | | Random artist (never cached) |
| GET | `/label` | `slug`, `page` | Label details + releases |
| GET | `/genres` | | All genres with sample albums |
| GET | `/genre` | `slug`, `period`, `page`, `sort`, `minReviews` | Genre best albums / recent (`period`: year, `all`, `recent`) |
| GET | `/subgenres` | `genreId` | Subgenres list for a genre |
| GET | `/tag` | `tag`, `type`, `year`, `page` | Albums or media by tag |
| GET | `/publication` | `slug` | Publication details + reviews + top albums |
| GET | `/publication/reviews` | `slug`, `page` | Recent reviews by a publication |
| GET | `/publication/lists` | `slug`, `page` | Year-end lists by a publication |
| GET | `/publication/perfect` | `slug` | Perfect scores by decade |
| GET | `/critic` | `slug`, `page` | Critic details + reviews |
| GET | `/song` | `slug` | Song details, credits, ratings |
| GET | `/song/ratings` | `slug`, `page` | All user ratings for a song |
| GET | `/songs/top` | `period` (year, decade, `all`), `page` | Users' best songs |
| GET | `/user` | `username` | User profile + stats |
| GET | `/user/ratings` | `username`, `page`, `type`, `decade`, `sort` | Albums rated by a user |
| GET | `/user/reviews` | `username`, `page` | Reviews written by a user |
| GET | `/user/listened` | `username`, `page` | Albums a user listened to |
| GET | `/user/library` | `username`, `t`, `s`, `page` | A user's library |
| GET | `/user/liked-albums` | `username`, `page` | Albums a user has liked |
| GET | `/user/tags` | `username`, `scope`, `sort` | Tags a user applied |
| GET | `/user/tag` | `username`, `tag`, `sort`, `page` | A user's albums with a tag |
| GET | `/user/lists` | `username`, `page` | Lists created by a user |
| GET | `/user/list` | `username`, `slug`, `sort`, `page` | A specific user list + comments |
| GET | `/user/review` | `username`, `slug` | A single user review of an album |
| GET | `/user/followers` | `username`, `page` | A user's followers |
| GET | `/user/following` | `username`, `page` | Users a user follows |
| GET | `/users` | | Community updates (reviews + lists) |
| GET | `/user-reviews` | `period` (all, popular, month, year), `page` | Popular user reviews |
| GET | `/faq` | | Site FAQ |
| GET | `/guidelines` | `type` (review, comment) | Community guidelines & rules |
| GET | `/changelog` | | Site changelog |
| GET | `/stats` | | Site statistics & community leaderboards |
| GET | `/ratings` | `source`, `period`, `page`, `genre` (user charts), `sort`, `minReviews` | Album charts (critic/user/publication/genre) |
| GET | `/top-artists` | `genre`, `scope`, `page` | Highest rated artists (`scope`: critics, users) |
| GET | `/releases` | `page` | New album releases |
| GET | `/releases/singles` | `page` | New single releases |
| GET | `/releases/this-week` | `page` | This week's releases |
| GET | `/releases/by-date` | `year`, `month`, `week`, `decade`, `genre`, `page` | Browse releases by date |
| GET | `/releases/vibe` | `vibe`, `year`, `sort`, `type`, `page` | Releases tagged with a vibe/mood |
| GET | `/recently-added` | `page` | Recently added albums |
| GET | `/on-this-day` | | Album anniversaries for today |
| GET | `/upcoming` | `page` | Upcoming releases |
| GET | `/discover` | | Discover albums |
| GET | `/discover/singles` | | Discover singles |
| GET | `/discover/anticipated` | | Anticipated releases |
| GET | `/discover/under-radar` | | Under the radar |
| GET | `/discover/top-rated` | | Recent best music |
| GET | `/discover/people` | | What people are talking about |
| GET | `/must-hear` | `year`, `decade`, `page` | Must-hear albums |
| GET | `/news` | `page`, `type` | News feed |
| GET | `/news-item` | `slug` | Single news item + comments |
| GET | `/lists` | `year`, `sort`, `page` | Publication lists |
| GET | `/lists/users` | `page` | Latest user-created lists |
| GET | `/list/:slug` | | List detail |
| GET | `/updates` | `filter`, `page` | Latest site updates |
| GET | `/home` | | Homepage sections |
| GET | `/search` | `q` | Search albums, artists, labels, lists, news, tags, users |
| GET | `/search/albums` | `q`, `page` | Search albums |
| GET | `/search/artists` | `q`, `page` | Search artists |
| GET | `/search/labels` | `q`, `page` | Search labels |
| GET | `/search/lists` | `q`, `page` | Search user lists |
| GET | `/search/news` | `q`, `page` | Search news |
| GET | `/search/tags` | `q`, `page` | Search tags |
| GET | `/search/users` | `q`, `page` | Search users |

## Notes

The `/album` endpoint calls two additional PHP endpoints for stats (favorites, likes, listens, library count, lists) and credits (performers, songwriters, producers). Pass `minimal=true` to skip those and return only HTML-scraped data.

Both PHP endpoints require same-origin session cookies to return data. Without auth cookies they will return null for `stats` and `credits`.
