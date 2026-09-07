export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Album of the Year API",
    version: "1.0.0",
    description:
      "Unofficial REST API for albumoftheyear.org. Scrapes public pages and returns structured JSON. Free to use, but please provide credit.",
  },
  servers: [{ url: "/", description: "Production" }],
  paths: {
    "/album": {
      get: {
        summary: "Get album details",
        description:
          "Return full album details including scores, tracklist, reviews, streaming links, stats, and credits. Provide either slug (ID or full slug for direct lookup) or both artist and name (search-based lookup). Pass minimal=true to skip the PHP-based stats and credits calls.",
        operationId: "getAlbum",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "slug",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "AOTY album ID or full slug (e.g. '2915' or '2915-outkast-aquemini'). Use this or artist+name.",
            example: "2915",
          },
          {
            name: "artist",
            in: "query",
            required: false,
            schema: { type: "string" },
            example: "OutKast",
          },
          {
            name: "name",
            in: "query",
            required: false,
            schema: { type: "string" },
            example: "Aquemini",
          },
          {
            name: "minimal",
            in: "query",
            required: false,
            schema: { type: "boolean", default: false },
            description: "When true, skips moreStatsAlbum.php and showAlbumCredits.php calls. stats and credits will be null.",
          },
        ],
        responses: {
          "200": {
            description: "Album details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AlbumDetail" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/releases": {
      get: {
        summary: "New album releases",
        operationId: "getReleases",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "List of new releases",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/releases/singles": {
      get: {
        summary: "New single releases",
        operationId: "getReleaseSingles",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "List of new singles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/upcoming": {
      get: {
        summary: "Upcoming album releases",
        operationId: "getUpcoming",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "List of upcoming releases",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover": {
      get: {
        summary: "Popular albums right now",
        operationId: "getDiscover",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Currently popular albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover/singles": {
      get: {
        summary: "Popular singles right now",
        operationId: "getDiscoverSingles",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Currently popular singles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover/anticipated": {
      get: {
        summary: "Highly anticipated upcoming albums",
        operationId: "getDiscoverAnticipated",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Most anticipated albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover/under-radar": {
      get: {
        summary: "Under the radar albums",
        operationId: "getDiscoverUnderRadar",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Hidden gem albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/must-hear": {
      get: {
        summary: "Must-hear albums",
        description:
          "Albums designated as must-hear. Use `year` for a specific year (e.g. 2026) or `decade` for a decade (e.g. 2020s). Paginated with `page`.",
        operationId: "getMustHear",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "year",
            in: "query",
            schema: { type: "integer" },
            example: 2026,
          },
          {
            name: "decade",
            in: "query",
            schema: { type: "string", enum: ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"] },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Must-hear albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    year: { type: "string" },
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/news": {
      get: {
        summary: "Music news feed",
        operationId: "getNews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["newsworthy", "new", "comment"],
              default: "newsworthy",
            },
            description: "Feed type: newsworthy (top), new (latest), comment (most discussed)",
          },
        ],
        responses: {
          "200": {
            description: "News items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    type: { type: "string" },
                    items: { type: "array", items: { $ref: "#/components/schemas/NewsItem" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/feed/news": {
      get: {
        summary: "Music news feed from RSS",
        operationId: "getNewsFeed",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "xml"], default: "json" },
            description: "Response format: json (default) or xml",
          },
        ],
        responses: {
          "200": {
            description: "News feed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RssFeed" },
              },
              "application/xml": {
                schema: { type: "string" },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/feed/news.xml": {
      get: {
        summary: "Raw RSS 2.0 XML news feed",
        operationId: "getNewsFeedXml",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "RSS XML news feed",
            content: {
              "application/xml": {
                schema: { type: "string" },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/lists": {
      get: {
        summary: "Year-end critic lists index",
        operationId: "getLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "year",
            in: "query",
            schema: { type: "integer" },
            example: 2025,
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["newest"] },
            description: "Pass newest for recently added lists",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Critic list index",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    year: { type: "integer" },
                    sort: { type: ["string", "null"] },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/ListEntry" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/list/{slug}": {
      get: {
        summary: "Get a specific critic list",
        operationId: "getList",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "2618-the-needle-drops-top-50-albums-of-2025",
          },
        ],
        responses: {
          "200": {
            description: "List detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    sourceUrl: { type: "string" },
                    items: { type: "array", items: { $ref: "#/components/schemas/ListDetailItem" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search": {
      get: {
        summary: "Search all content",
        operationId: "search",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "radiohead",
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                    labels: { type: "array", items: { $ref: "#/components/schemas/SearchLabel" } },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                    news: { type: "array", items: { $ref: "#/components/schemas/NewsSearchItem" } },
                    tags: { type: "array", items: { $ref: "#/components/schemas/TagItem" } },
                    users: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/albums": {
      get: {
        summary: "Search albums",
        operationId: "searchAlbums",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Album search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/artists": {
      get: {
        summary: "Search artists",
        operationId: "searchArtists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Artist search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/labels": {
      get: {
        summary: "Search record labels",
        operationId: "searchLabels",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Label search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    labels: { type: "array", items: { $ref: "#/components/schemas/SearchLabel" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/lists": {
      get: {
        summary: "Search user lists",
        operationId: "searchLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User list search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/news": {
      get: {
        summary: "Search news",
        operationId: "searchNews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "News search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    news: { type: "array", items: { $ref: "#/components/schemas/NewsSearchItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/tags": {
      get: {
        summary: "Search tags",
        operationId: "searchTags",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Tag search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    tags: { type: "array", items: { $ref: "#/components/schemas/TagItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/users": {
      get: {
        summary: "Search users",
        operationId: "searchUsers",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    page: { type: "integer" },
                    users: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/search/autocomplete": {
      get: {
        summary: "Typeahead autocomplete suggestions across all entities",
        operationId: "getSearchAutocomplete",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query prefix" },
        ],
        responses: {
          "200": {
            description: "Search autocomplete suggestions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    suggestions: { type: "array", items: { $ref: "#/components/schemas/SearchAutocompleteItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/labels/autocomplete": {
      get: {
        summary: "Autocomplete suggestions for record labels",
        operationId: "getLabelAutocomplete",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Label query prefix" },
        ],
        responses: {
          "200": {
            description: "Label autocomplete suggestions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    suggestions: { type: "array", items: { $ref: "#/components/schemas/LabelAutocompleteItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artist": {
      get: {
        summary: "Get artist details and discography",
        operationId: "getArtist",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, description: "Artist slug, e.g. '183-kanye-west'", example: "183-kanye-west" },
          { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Filter discography by release type (lp, ep, single, mixtape, ...)" },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["critic", "user", "popular"] }, description: "Sort discography (works best with type=featured)" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Artist details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ArtistDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artist/similar": {
      get: {
        summary: "Get similar artists",
        operationId: "getSimilarArtists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "183-kanye-west" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Similar artists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artist/songs": {
      get: {
        summary: "Get community's top songs by an artist",
        operationId: "getArtistSongs",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "183-kanye-west" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Top songs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    songs: { type: "array", items: { $ref: "#/components/schemas/TopSong" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/label": {
      get: {
        summary: "Get label details and releases",
        operationId: "getLabel",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "845-aap-worldwide" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Label details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/LabelDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/genres": {
      get: {
        summary: "List all genres with sample albums",
        operationId: "getGenres",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Genre index",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    genres: { type: "array", items: { $ref: "#/components/schemas/GenreIndexItem" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/genre": {
      get: {
        summary: "Get genre page (best albums, recent, top artists)",
        description: "Omit period for the genre overview. Use period=2026 for best of a year, period=all for all-time, period=recent for new releases.",
        operationId: "getGenre",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "3-hip-hop" },
          { name: "period", in: "query", required: false, schema: { type: "string" }, example: "2026" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["standard"] }, description: "Pass standard to disable weighted sorting (chart periods)" },
          { name: "minReviews", in: "query", required: false, schema: { type: "string", enum: ["5", "10", "15", "20"] }, description: "Minimum review count (chart periods)" },
        ],
        responses: {
          "200": {
            description: "Genre detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GenreDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/subgenres": {
      get: {
        summary: "Get subgenres for a genre by ID via AJAX backend",
        operationId: "getSubGenres",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "genreId", in: "query", required: true, schema: { type: "string" }, example: "3" },
        ],
        responses: {
          "200": {
            description: "Subgenres list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    genreId: { type: "string" },
                    heading: { type: "string" },
                    subgenres: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/tag": {
      get: {
        summary: "Browse albums or media by tag",
        operationId: "getTag",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "tag", in: "query", required: true, schema: { type: "string" }, example: "hip hop" },
          { name: "type", in: "query", required: false, schema: { type: "string", enum: ["albums", "media"], default: "albums" } },
          { name: "year", in: "query", required: false, schema: { type: "string" }, description: "Filter tag albums by year, e.g. 2026" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Tag results",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TagResults" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/publication": {
      get: {
        summary: "Get publication details, recent reviews and top albums",
        operationId: "getPublication",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1-pitchfork" },
        ],
        responses: {
          "200": {
            description: "Publication details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PublicationDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/publication/reviews": {
      get: {
        summary: "Get recent reviews by a publication",
        operationId: "getPublicationReviews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1-pitchfork" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Publication reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    reviews: { type: "array", items: { $ref: "#/components/schemas/PublicationReview" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/publication/lists": {
      get: {
        summary: "Get year-end lists by a publication",
        operationId: "getPublicationLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1-pitchfork" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Publication lists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/ListEntry" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/critic": {
      get: {
        summary: "Get critic details and reviews",
        operationId: "getCritic",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "2-anthony-fantano" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Critic details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CriticDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/song": {
      get: {
        summary: "Get song details, credits and ratings",
        operationId: "getSong",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "2580-ghost-town" },
        ],
        responses: {
          "200": {
            description: "Song details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SongDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/song/ratings": {
      get: {
        summary: "All user ratings for a song, paginated",
        operationId: "getSongRatings",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "2580-ghost-town" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Song ratings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/SongRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/home": {
      get: {
        summary: "Homepage sections (new releases, charts, trending, ...)",
        operationId: "getHome",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Homepage content",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    newReleases: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    news: { type: "array", items: { $ref: "#/components/schemas/NewsItem" } },
                    anticipated: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    criticsBest: { type: "array", items: { $ref: "#/components/schemas/ChartItem" } },
                    usersBest: { type: "array", items: { $ref: "#/components/schemas/ChartItem" } },
                    popular: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    popularReviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
                    underRadar: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    onThisDay: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    recentlyAdded: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                    topSongs: { type: "array", items: { $ref: "#/components/schemas/TopSong" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/songs/top": {
      get: {
        summary: "Users' best songs of a year, decade, or all time",
        operationId: "getTopSongs",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "period", in: "query", schema: { type: "string" }, description: "Year (2026), decade (2020s) or all", example: "2026" },
          { name: "year", in: "query", schema: { type: "string" }, description: "Alias for period (e.g. 2026)", example: "2026" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Top songs chart",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    period: { type: "string" },
                    page: { type: "integer" },
                    songs: { type: "array", items: { $ref: "#/components/schemas/TopSong" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user": {
      get: {
        summary: "Get user profile and stats",
        operationId: "getUser",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "User profile",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserProfile" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/ratings": {
      get: {
        summary: "Get albums rated by a user",
        operationId: "getUserRatings",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Filter by release type (lp, ep, single, mixtape, compilation, reissue, soundtrack, perfect...)" },
          { name: "decade", in: "query", required: false, schema: { type: "string" }, description: "Filter by decade, e.g. 2020", example: "2020" },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["highest", "lowest", "release-date"] } },
        ],
        responses: {
          "200": {
            description: "User ratings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    page: { type: "integer" },
                    type: { type: ["string", "null"] },
                    decade: { type: ["string", "null"] },
                    sort: { type: ["string", "null"] },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/UserRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/reviews": {
      get: {
        summary: "Get reviews written by a user",
        operationId: "getUserReviews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    page: { type: "integer" },
                    sort: { type: "string" },
                    reviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/listened": {
      get: {
        summary: "Get albums a user has listened to",
        operationId: "getUserListened",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Listened albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    page: { type: "integer" },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/UserRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/library": {
      get: {
        summary: "Get a user's library",
        operationId: "getUserLibrary",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "t", in: "query", required: false, schema: { type: "string", enum: ["listened", "rated", "unrated"] }, description: "Filter: listened, rated or unrated" },
          { name: "s", in: "query", required: false, schema: { type: "string", enum: ["newest", "oldest", "critic", "user"] }, description: "Sort order" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Library albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    show: { type: ["string", "null"] },
                    sort: { type: ["string", "null"] },
                    page: { type: "integer" },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/UserRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/liked-albums": {
      get: {
        summary: "Get albums a user has liked (favorited)",
        operationId: "getUserLikedAlbums",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User liked albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    page: { type: "integer" },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/UserRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/tags": {
      get: {
        summary: "Get tags a user has applied",
        operationId: "getUserTags",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "scope", in: "query", schema: { type: "string", enum: ["albums", "artists"], default: "albums" } },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["popularity", "name"] } },
        ],
        responses: {
          "200": {
            description: "User tags",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    scope: { type: "string" },
                    sort: { type: ["string", "null"] },
                    tags: { type: "array", items: { $ref: "#/components/schemas/UserTagEntry" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/tag": {
      get: {
        summary: "Get a user's albums with a specific tag",
        operationId: "getUserTag",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "tag", in: "query", required: true, schema: { type: "string" }, example: "masterpiece" },
          { name: "sort", in: "query", required: false, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Tagged albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    tag: { type: "string" },
                    sort: { type: ["string", "null"] },
                    page: { type: "integer" },
                    ratings: { type: "array", items: { $ref: "#/components/schemas/UserRating" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/lists": {
      get: {
        summary: "Get lists created by a user",
        operationId: "getUserLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User lists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/list": {
      get: {
        summary: "Get a specific user list",
        operationId: "getUserList",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, description: "List id + slug, e.g. '4445/mu-essentials'", example: "4445/mu-essentials" },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["list-low-high", "artist-name", "recent", "popular", "creator-highest", "creator-lowest", "critic-highest", "critic-lowest", "user-highest", "user-lowest", "newest", "oldest"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User list detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserListDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/followers": {
      get: {
        summary: "Get a user's followers",
        operationId: "getUserFollowers",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Followers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    kind: { type: "string" },
                    page: { type: "integer" },
                    users: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/following": {
      get: {
        summary: "Get users a user follows",
        operationId: "getUserFollowing",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Following",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    kind: { type: "string" },
                    page: { type: "integer" },
                    users: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/review": {
      get: {
        summary: "Get a single user review of an album",
        operationId: "getUserReview",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, description: "Album id + slug, e.g. '1998-my-beautiful-dark-twisted-fantasy'", example: "1998-my-beautiful-dark-twisted-fantasy" },
        ],
        responses: {
          "200": {
            description: "User review detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserReviewDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/genres": {
      get: {
        summary: "Get all genres a user has rated and listened to",
        operationId: "getUserGenres",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "User genres breakdown",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    genres: { type: "array", items: { $ref: "#/components/schemas/UserGenreItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user/badges": {
      get: {
        summary: "Get all badges unlocked by a user",
        operationId: "getUserBadges",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "username", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "User unlocked badges",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    badges: { type: "array", items: { $ref: "#/components/schemas/UserBadgeItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/users": {
      get: {
        summary: "Community updates (latest reviews and lists)",
        operationId: "getCommunity",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Community updates",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/user-reviews": {
      get: {
        summary: "Popular user reviews across the site",
        operationId: "getGlobalUserReviews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "period", in: "query", schema: { type: "string", enum: ["all", "popular", "month", "year"], default: "all" }, description: "all = default feed, popular = all-time popular, month = popular this month, year = popular this year" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    period: { type: "string" },
                    page: { type: "integer" },
                    reviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/ratings": {
      get: {
        summary: "Album charts (highest/lowest rated, per publication, per genre)",
        description: "Source examples: 6-highest-rated, user-highest-rated, worst, 1-pitchfork-highest-rated. Period examples: 2026, 2020s, all.",
        operationId: "getRatings",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "source", in: "query", schema: { type: "string", default: "6-highest-rated" } },
          { name: "period", in: "query", schema: { type: "string", default: "2026" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "genre", in: "query", required: false, schema: { type: "string" }, description: "Genre slug suffix, e.g. 'hip-hop' (only with source=user-highest-rated)" },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["standard"] }, description: "Pass standard to disable weighted sorting" },
          { name: "minReviews", in: "query", required: false, schema: { type: "string", enum: ["5", "10", "15", "20"] } },
        ],
        responses: {
          "200": {
            description: "Chart items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    source: { type: "string" },
                    period: { type: "string" },
                    page: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/ChartItem" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/top-artists": {
      get: {
        summary: "Highest rated artists, optionally by genre",
        operationId: "getTopArtists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "genre", in: "query", required: false, schema: { type: "string" }, example: "hip-hop" },
          { name: "scope", in: "query", schema: { type: "string", enum: ["critics", "users"], default: "critics" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Top artists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    genre: { type: ["string", "null"] },
                    scope: { type: "string" },
                    page: { type: "integer" },
                    artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/releases/this-week": {
      get: {
        summary: "This week's new releases",
        operationId: "getReleasesThisWeek",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "This week's releases",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/releases/by-date": {
      get: {
        summary: "Browse releases by year, month, week or decade",
        operationId: "getReleasesByDate",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "year", in: "query", schema: { type: "string" }, example: "2026" },
          { name: "month", in: "query", required: false, schema: { type: "string" }, description: "Month slug, e.g. 'september-09'", example: "september-09" },
          { name: "week", in: "query", required: false, schema: { type: "string" }, description: "ISO week number, e.g. '36'" },
          { name: "decade", in: "query", required: false, schema: { type: "string" }, example: "2020s" },
          { name: "genre", in: "query", required: false, schema: { type: "string" }, description: "Genre id filter, e.g. '3'" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Releases for the period",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    year: { type: "string" },
                    month: { type: ["string", "null"] },
                    week: { type: ["string", "null"] },
                    decade: { type: ["string", "null"] },
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/releases/vibe": {
      get: {
        summary: "Releases by vibe mood/aesthetic tag",
        operationId: "getReleasesByVibe",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "vibe", in: "query", required: true, schema: { type: "string" }, example: "anthemic" },
          { name: "year", in: "query", required: false, schema: { type: "string" }, example: "2024" },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["release", "critic", "user", "likes"], default: "release" } },
          { name: "type", in: "query", required: false, schema: { type: "string" }, example: "lp" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Releases for the vibe",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    vibe: { type: "string" },
                    year: { type: "string" },
                    sort: { type: "string" },
                    type: { type: ["string", "null"] },
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/recently-added": {
      get: {
        summary: "Recently added albums",
        operationId: "getRecentlyAdded",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Recently added albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/on-this-day": {
      get: {
        summary: "Album anniversaries released on this day",
        operationId: "getOnThisDay",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "On-this-day albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover/top-rated": {
      get: {
        summary: "Recent best music",
        operationId: "getDiscoverTopRated",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Top rated recent albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/discover/people": {
      get: {
        summary: "Discover albums people are talking about",
        operationId: "getDiscoverPeople",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Trending albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/news-item": {
      get: {
        summary: "Get a single news item with comments",
        operationId: "getNewsItem",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "33593-converge-unleash-new-song-doom-in-bloom" },
        ],
        responses: {
          "200": {
            description: "News detail",
            content: { "application/json": { schema: { $ref: "#/components/schemas/NewsDetail" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/similar": {
      get: {
        summary: "Albums similar to the given album",
        operationId: "getSimilarAlbums",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Similar albums",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/user-reviews": {
      get: {
        summary: "User reviews for an album",
        operationId: "getAlbumUserReviews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["popular", "recent", "worst"], default: "popular" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Album user reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    sort: { type: "string" },
                    page: { type: "integer" },
                    reviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/comments": {
      get: {
        summary: "Comments on an album",
        operationId: "getAlbumComments",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Album comments",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    comments: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/user-lists": {
      get: {
        summary: "User lists containing an album",
        operationId: "getAlbumUserLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User lists with this album",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/critic-lists": {
      get: {
        summary: "Year-end critic lists ranking an album",
        operationId: "getAlbumCriticLists",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Critic lists containing this album",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/CriticListRank" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/critic-reviews": {
      get: {
        summary: "Critic reviews for an album, sorted",
        operationId: "getAlbumCriticReviews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1998-kanye-west-my-beautiful-dark-twisted-fantasy" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["highest", "lowest", "newest", "oldest"], default: "highest" } },
        ],
        responses: {
          "200": {
            description: "Sorted critic reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    sort: { type: "string" },
                    reviews: { type: "array", items: { $ref: "#/components/schemas/CriticReview" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/tags": {
      get: {
        summary: "Complete tag list for an album",
        operationId: "getAlbumTags",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "564912-asap-rocky-dont-be-dumb" },
        ],
        responses: {
          "200": {
            description: "Album tags",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    tags: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/tags/autocomplete": {
      get: {
        summary: "Autocomplete suggestions for album tags",
        operationId: "getAlbumTagAutocomplete",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "q", in: "query", required: true, schema: { type: "string" }, example: "hip" },
        ],
        responses: {
          "200": {
            description: "Tag autocomplete suggestions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/rating-history": {
      get: {
        summary: "Rating score trend at each ratings milestone",
        operationId: "getAlbumRatingHistory",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "albumId", in: "query", required: true, schema: { type: "string" }, description: "Numeric album ID (see id in /album)", example: "1998" },
        ],
        responses: {
          "200": {
            description: "Album rating score trend milestones",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albumId: { type: "string" },
                    headline: { type: "string" },
                    milestones: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          milestone: { type: "string" },
                          date: { type: ["string", "null"] },
                          score: { type: "string" },
                          exactScore: { type: ["string", "null"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/distribution": {
      get: {
        summary: "Score distribution histogram for an album",
        operationId: "getAlbumDistribution",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "albumId", in: "query", required: true, schema: { type: "string" }, description: "Numeric album ID (see id in /album)", example: "1998" },
          { name: "format", in: "query", required: false, schema: { type: "string", enum: ["all", "following"], default: "all" } },
        ],
        responses: {
          "200": {
            description: "Album ratings distribution",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albumId: { type: "string" },
                    format: { type: "string" },
                    rows: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          count: { type: "integer" },
                          percentage: { type: ["string", "null"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/album/comments/replies": {
      get: {
        summary: "Replies to an album comment",
        operationId: "getAlbumCommentReplies",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "albumId", in: "query", required: true, schema: { type: "string" }, description: "Numeric album ID (see id in /album)", example: "1998" },
          { name: "commentId", in: "query", required: true, schema: { type: "string" }, example: "4960474" },
        ],
        responses: {
          "200": {
            description: "Comment replies",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    albumId: { type: "string" },
                    commentId: { type: "string" },
                    replies: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artist/news": {
      get: {
        summary: "News about an artist",
        operationId: "getArtistNews",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "183-kanye-west" },
          { name: "type", in: "query", schema: { type: "string", enum: ["newsworthy", "new"], default: "newsworthy" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Artist news",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    page: { type: "integer" },
                    type: { type: "string" },
                    items: { type: "array", items: { $ref: "#/components/schemas/NewsItem" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artist/credits": {
      get: {
        summary: "Albums an artist is credited on (features, production, ...)",
        description: "Omit role to list available credit roles with counts.",
        operationId: "getArtistCredits",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "183-kanye-west" },
          { name: "role", in: "query", required: false, schema: { type: "string" }, example: "Feature" },
          { name: "sort", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Credit roles or credited albums",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/random/artist": {
      get: {
        summary: "Get a random artist (never cached)",
        operationId: "getRandomArtist",
        responses: {
          "200": {
            description: "Random artist details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ArtistDetail" } } },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/random/album": {
      get: {
        summary: "Get a random album (never cached)",
        operationId: "getRandomAlbum",
        responses: {
          "200": {
            description: "Random album details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AlbumDetail" } } },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/publication/perfect": {
      get: {
        summary: "Perfect scores given by a publication, by decade",
        operationId: "getPublicationPerfect",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "slug", in: "query", required: true, schema: { type: "string" }, example: "1-pitchfork" },
        ],
        responses: {
          "200": {
            description: "Perfect scores",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slug: { type: "string" },
                    sections: { type: "array", items: { $ref: "#/components/schemas/PerfectSection" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/artists": {
      get: {
        summary: "Artists overview (popular now, recently added, ...)",
        operationId: "getArtistsOverview",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Artists overview sections",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sections: { type: "array", items: { $ref: "#/components/schemas/ArtistsOverviewSection" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/faq": {
      get: {
        summary: "Site FAQ",
        operationId: "getFaq",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "FAQ items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/FaqItem" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/changelog": {
      get: {
        summary: "Site changelog",
        operationId: "getChangelog",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Changelog entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    entries: { type: "array", items: { $ref: "#/components/schemas/ChangelogEntry" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/stats": {
      get: {
        summary: "Site statistics, database totals and community contribution leaderboards",
        operationId: "getStats",
        parameters: [{ $ref: "#/components/parameters/CacheControl" }],
        responses: {
          "200": {
            description: "Site statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          value: { type: "string" },
                        },
                      },
                    },
                    leaderboards: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          key: { type: ["string", "null"] },
                          timestamp: { type: ["string", "null"] },
                          items: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                value: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/guidelines": {
      get: {
        summary: "Community guidelines for reviews or comments",
        operationId: "getGuidelines",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["review", "comment"], default: "review" },
            description: "Guidelines type: review or comment",
          },
        ],
        responses: {
          "200": {
            description: "Community guidelines",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    bestPractices: { type: "array", items: { type: "string" } },
                    whatToAvoid: { type: "array", items: { type: "string" } },
                    footnote: { type: ["string", "null"] },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          text: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/lists/users": {
      get: {
        summary: "Latest user-created lists",
        operationId: "getUserListsIndex",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "User lists index",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    lists: { type: "array", items: { $ref: "#/components/schemas/UserListEntry" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
    "/updates": {
      get: {
        summary: "Latest site updates (new albums, songs, lists)",
        operationId: "getUpdates",
        parameters: [
          { $ref: "#/components/parameters/CacheControl" },
          { name: "filter", in: "query", required: false, schema: { type: "string", enum: ["all"] }, description: "Pass all for the complete feed instead of recent highlights" },
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Site updates",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    filter: { type: ["string", "null"] },
                    page: { type: "integer" },
                    updates: { type: "array", items: { $ref: "#/components/schemas/SiteUpdate" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/ServerError" },
        },
      },
    },
  },
  components: {
    schemas: {
      AlbumBlock: {
        type: "object",
        properties: {
          url: { type: "string" },
          artist: { type: "string" },
          title: { type: "string" },
          cover: { type: "string" },
          mediaType: { type: "string", description: "lp, ep, single, mixtape, compilation, etc." },
          releaseDate: { type: "string" },
          criticScore: { type: ["string", "null"] },
          criticCount: { type: ["string", "null"] },
          userScore: { type: ["string", "null"] },
          userCount: { type: ["string", "null"] },
          mustHear: { type: "boolean" },
        },
      },
      AlbumDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          id: { type: "string" },
          title: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          cover: { type: "string" },
          datePublished: { type: "string" },
          format: { type: "string" },
          label: { type: ["string", "null"] },
          labelUrl: { type: ["string", "null"] },
          labels: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          genres: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          vibes: { type: "array", items: { type: "string" } },
          producers: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          writers: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          totalLength: { type: ["string", "null"] },
          criticScore: { type: ["string", "null"] },
          criticScoreExact: { type: ["string", "null"] },
          criticCount: { type: ["string", "null"] },
          userScore: { type: ["string", "null"] },
          userScoreExact: { type: ["string", "null"] },
          userCount: { type: ["string", "null"] },
          tracklist: { type: "array", items: { $ref: "#/components/schemas/Track" } },
          streamingLinks: { type: "array", items: { $ref: "#/components/schemas/StreamingLink" } },
          reviews: { type: "array", items: { $ref: "#/components/schemas/CriticReview" } },
          popularUserReviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
          recentUserReviews: { type: "array", items: { $ref: "#/components/schemas/UserReview" } },
          moreAlbums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
          similarAlbums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
          contributionsBy: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          yearEndLists: { type: "array", items: { $ref: "#/components/schemas/CriticListRank" } },
          userLists: { type: "array", items: { $ref: "#/components/schemas/AlbumUserListPreview" } },
          comments: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
          stats: { oneOf: [{ $ref: "#/components/schemas/AlbumStats" }, { type: "null" }] },
          credits: { oneOf: [{ type: "array", items: { $ref: "#/components/schemas/CreditSection" } }, { type: "null" }] },
        },
      },
      AlbumUserListPreview: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          username: { type: "string" },
          userUrl: { type: "string" },
          avatar: { type: ["string", "null"] },
        },
      },
      AlbumStats: {
        type: "object",
        properties: {
          favorites: { type: ["integer", "null"] },
          likes: { type: ["integer", "null"] },
          listens: { type: ["integer", "null"] },
          libraryCount: { type: ["integer", "null"] },
          lists: { type: ["integer", "null"] },
        },
      },
      CreditEntry: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          image: { type: ["string", "null"] },
          roles: { type: "array", items: { type: "string" } },
        },
      },
      CreditSection: {
        type: "object",
        properties: {
          title: { type: "string" },
          credits: { type: "array", items: { $ref: "#/components/schemas/CreditEntry" } },
        },
      },
      Track: {
        type: "object",
        properties: {
          number: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          length: { type: "string" },
          rating: { type: ["string", "null"] },
          ratingCount: { type: ["integer", "null"] },
          notes: { type: ["string", "null"] },
          features: { type: "array", items: { type: "string" } },
        },
      },
      CriticReview: {
        type: "object",
        properties: {
          score: { type: "string" },
          publication: { type: "string" },
          author: { type: "string" },
          text: { type: "string" },
          image: { type: "string" },
          url: { type: "string" },
          date: { type: "string" },
        },
      },
      StreamingLink: {
        type: "object",
        properties: {
          platform: { type: "string" },
          url: { type: "string" },
        },
      },
      NewsItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string" },
          title: { type: "string" },
          image: { type: ["string", "null"] },
          source: { type: "string" },
          sourceUrl: { type: "string" },
          date: { type: "string" },
          likes: { type: "string" },
          comments: { type: "string" },
        },
      },
      ListEntry: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          publication: { type: "string" },
          cover: { type: ["string", "null"] },
        },
      },
      ListDetailItem: {
        type: "object",
        properties: {
          rank: { type: "string" },
          artist: { type: "string" },
          album: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          cover: { type: "string" },
          date: { type: "string" },
          genres: { type: "array", items: { type: "string" } },
          score: { type: ["string", "null"] },
          scoreExact: { type: ["string", "null"] },
          ratingCount: { type: ["string", "null"] },
          blurb: { type: ["string", "null"] },
          otherLists: { type: ["integer", "null"] },
        },
      },
      SearchArtist: {
        type: "object",
        properties: {
          url: { type: "string" },
          name: { type: "string" },
          image: { type: ["string", "null"] },
        },
      },
      SearchLabel: {
        type: "object",
        properties: {
          url: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
        },
      },
      NamedLink: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
        },
      },
      DiscographySection: {
        type: "object",
        properties: {
          title: { type: "string" },
          albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
        },
      },
      ArtistDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          name: { type: "string" },
          image: { type: ["string", "null"] },
          criticScore: { type: ["string", "null"] },
          criticCount: { type: ["string", "null"] },
          userScore: { type: ["string", "null"] },
          userCount: { type: ["string", "null"] },
          followers: { type: ["string", "null"] },
          genres: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          alsoKnownAs: { type: "array", items: { type: "string" } },
          members: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          formerMembers: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          memberOf: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          formerlyOf: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          relatedArtists: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          tags: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          website: { type: ["string", "null"] },
          sections: { type: "array", items: { $ref: "#/components/schemas/DiscographySection" } },
          topSongs: { type: "array", items: { $ref: "#/components/schemas/TopSong" } },
          similarArtists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
        },
      },
      LabelDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          name: { type: "string" },
          image: { type: ["string", "null"] },
          website: { type: ["string", "null"] },
          parentLabel: { anyOf: [{ $ref: "#/components/schemas/NamedLink" }, { type: "null" }] },
          description: { type: ["string", "null"] },
          page: { type: "integer" },
          albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
        },
      },
      GenreSection: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: ["string", "null"] },
          albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
          artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
        },
      },
      GenreDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          page: { type: "integer" },
          sections: { type: "array", items: { $ref: "#/components/schemas/GenreSection" } },
          items: { type: "array", items: { $ref: "#/components/schemas/ChartItem" } },
          childGenres: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
        },
      },
      GenreIndexItem: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
        },
      },
      TagResults: {
        type: "object",
        properties: {
          tag: { type: "string" },
          type: { type: "string" },
          year: { type: ["string", "null"] },
          page: { type: "integer" },
          albums: { type: "array", items: { $ref: "#/components/schemas/AlbumBlock" } },
          media: { type: "array", items: { $ref: "#/components/schemas/NewsItem" } },
        },
      },
      PublicationReview: {
        type: "object",
        properties: {
          album: { type: "string" },
          albumUrl: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          cover: { type: ["string", "null"] },
          score: { type: "string" },
          reviewUrl: { type: "string" },
        },
      },
      PublicationDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          image: { type: ["string", "null"] },
          website: { type: ["string", "null"] },
          albumsRated: { type: ["string", "null"] },
          averageRating: { type: ["string", "null"] },
          ratingDistribution: {
            type: "array",
            items: {
              type: "object",
              properties: {
                range: { type: "string" },
                count: { type: "integer" },
              },
            },
          },
          recentReviews: { type: "array", items: { $ref: "#/components/schemas/PublicationReview" } },
          topAlbums: { type: "array", items: { $ref: "#/components/schemas/PublicationReview" } },
        },
      },
      CriticReviewEntry: {
        type: "object",
        properties: {
          album: { type: "string" },
          albumUrl: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          cover: { type: ["string", "null"] },
          score: { type: "string" },
          text: { type: "string" },
          publication: { type: "string" },
          publicationUrl: { type: "string" },
          date: { type: ["string", "null"] },
        },
      },
      CriticDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          publication: { type: ["string", "null"] },
          publicationUrl: { type: ["string", "null"] },
          page: { type: "integer" },
          reviews: { type: "array", items: { $ref: "#/components/schemas/CriticReviewEntry" } },
        },
      },
      SongCredit: {
        type: "object",
        properties: {
          role: { type: "string" },
          artists: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
        },
      },
      SongRating: {
        type: "object",
        properties: {
          username: { type: "string" },
          userUrl: { type: "string" },
          avatar: { type: ["string", "null"] },
          rating: { type: "string" },
          date: { type: ["string", "null"] },
        },
      },
      SongDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          id: { type: "string" },
          title: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          cover: { type: ["string", "null"] },
          album: { type: ["string", "null"] },
          albumUrl: { type: ["string", "null"] },
          trackNumber: { type: ["string", "null"] },
          year: { type: ["string", "null"] },
          duration: { type: ["string", "null"] },
          userScore: { type: ["string", "null"] },
          userScoreExact: { type: ["string", "null"] },
          ratingCount: { type: ["string", "null"] },
          ratingDistribution: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                count: { type: "integer" },
              },
            },
          },
          credits: { type: "array", items: { $ref: "#/components/schemas/SongCredit" } },
          tags: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          topRatings: { type: "array", items: { $ref: "#/components/schemas/SongRating" } },
          comments: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
        },
      },
      TopSong: {
        type: "object",
        properties: {
          rank: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          album: { type: ["string", "null"] },
          albumUrl: { type: ["string", "null"] },
          cover: { type: ["string", "null"] },
          score: { type: ["string", "null"] },
          ratingCount: { type: ["string", "null"] },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          url: { type: "string" },
          username: { type: "string" },
          avatar: { type: ["string", "null"] },
          bio: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" },
              },
            },
          },
          subscriber: { type: "boolean" },
          ratingDistribution: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                count: { type: "integer" },
              },
            },
          },
          favorites: {
            type: "array",
            items: { $ref: "#/components/schemas/AlbumBlock" },
          },
          stats: {
            type: "object",
            properties: {
              ratings: { type: "string" },
              reviews: { type: "string" },
              lists: { type: "string" },
              followers: { type: "string" },
              following: { type: "string" },
            },
          },
        },
      },
      UserRating: {
        allOf: [
          { $ref: "#/components/schemas/AlbumBlock" },
          {
            type: "object",
            properties: {
              userRating: { type: ["string", "null"] },
              ratedDate: { type: ["string", "null"] },
              reviewUrl: { type: ["string", "null"] },
            },
          },
        ],
      },
      UserReview: {
        type: "object",
        properties: {
          url: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          album: { type: "string" },
          albumUrl: { type: "string" },
          cover: { type: ["string", "null"] },
          username: { type: "string" },
          userUrl: { type: "string" },
          avatar: { type: ["string", "null"] },
          rating: { type: ["string", "null"] },
          text: { type: "string" },
          likes: { type: "string" },
          comments: { type: "string" },
          date: { type: ["string", "null"] },
        },
      },
      UserReviewDetail: {
        allOf: [
          { $ref: "#/components/schemas/UserReview" },
          {
            type: "object",
            properties: {
              albumId: { type: ["string", "null"] },
              trackRatings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    number: { type: ["string", "null"] },
                    title: { type: "string" },
                    url: { type: "string" },
                    rating: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
        ],
      },
      AotyComment: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          userUrl: { type: "string" },
          avatar: { type: ["string", "null"] },
          date: { type: "string" },
          dateExact: { type: "string" },
          text: { type: "string" },
          replies: { type: "string" },
        },
      },
      UserListEntry: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          username: { type: "string" },
          userUrl: { type: "string" },
          avatar: { type: ["string", "null"] },
          covers: { type: "array", items: { type: "string" } },
          description: { type: ["string", "null"] },
          likes: { type: ["string", "null"] },
          comments: { type: ["string", "null"] },
        },
      },
      UserListDetailItem: {
        type: "object",
        properties: {
          rank: { type: "string" },
          artist: { type: "string" },
          artistUrl: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          cover: { type: ["string", "null"] },
          year: { type: ["string", "null"] },
        },
      },
      UserListDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          username: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          items: { type: "array", items: { $ref: "#/components/schemas/UserListDetailItem" } },
          comments: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
        },
      },
      ChartItem: {
        type: "object",
        properties: {
          rank: { type: "string" },
          title: { type: "string" },
          artist: { type: "string" },
          album: { type: "string" },
          url: { type: "string" },
          cover: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          genres: { type: "array", items: { type: "string" } },
          score: { type: ["string", "null"] },
          scoreExact: { type: ["string", "null"] },
          ratingCount: { type: ["string", "null"] },
          mustHear: { type: "boolean" },
        },
      },
      TagItem: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
        },
      },
      UserTagEntry: {
        type: "object",
        properties: {
          tag: { type: "string" },
          url: { type: "string" },
          count: { type: "string" },
        },
      },
      NewsSearchItem: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          source: { type: ["string", "null"] },
          image: { type: ["string", "null"] },
        },
      },
      NewsDetail: {
        type: "object",
        properties: {
          url: { type: "string" },
          id: { type: "string" },
          title: { type: "string" },
          source: { type: "string" },
          sourceUrl: { type: "string" },
          date: { type: "string" },
          image: { type: ["string", "null"] },
          text: { type: "string" },
          likes: { type: "string" },
          embedUrl: { type: ["string", "null"] },
          related: { type: "array", items: { $ref: "#/components/schemas/NamedLink" } },
          streamingLinks: { type: "array", items: { $ref: "#/components/schemas/StreamingLink" } },
          comments: { type: "array", items: { $ref: "#/components/schemas/AotyComment" } },
        },
      },
      SiteUpdate: {
        type: "object",
        properties: {
          kind: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          artist: { type: ["string", "null"] },
          artistUrl: { type: ["string", "null"] },
          image: { type: ["string", "null"] },
          meta: { type: ["string", "null"] },
          timeAgo: { type: ["string", "null"] },
        },
      },
      CriticListRank: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          publication: { type: "string" },
          publicationUrl: { type: ["string", "null"] },
          cover: { type: ["string", "null"] },
          rank: { type: ["string", "null"] },
        },
      },
      PerfectSection: {
        type: "object",
        properties: {
          title: { type: "string" },
          reviews: { type: "array", items: { $ref: "#/components/schemas/PublicationReview" } },
        },
      },
      ArtistsOverviewSection: {
        type: "object",
        properties: {
          title: { type: "string" },
          artists: { type: "array", items: { $ref: "#/components/schemas/SearchArtist" } },
        },
      },
      FaqItem: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
      ChangelogEntry: {
        type: "object",
        properties: {
          date: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          text: { type: "string" },
        },
      },
      LabelAutocompleteItem: {
        type: "object",
        properties: {
          value: { type: "string" },
          link: { type: "string" },
          description: { type: ["string", "null"] },
        },
      },
      SearchAutocompleteItem: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          link: { type: "string" },
          type: { type: "string" },
          image: { type: ["string", "null"] },
        },
      },
      UserGenreItem: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          count: { type: ["integer", "null"] },
          percentage: { type: ["string", "null"] },
          averageScore: { type: ["string", "null"] },
        },
      },
      UserBadgeItem: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: ["string", "null"] },
          image: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
        },
      },
      RssFeedItem: {
        type: "object",
        properties: {
          title: { type: "string" },
          link: { type: "string" },
          pubDate: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
      },
      RssFeed: {
        type: "object",
        properties: {
          title: { type: "string" },
          link: { type: "string" },
          description: { type: ["string", "null"] },
          items: { type: "array", items: { $ref: "#/components/schemas/RssFeedItem" } },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
    parameters: {
      CacheControl: {
        name: "cache",
        in: "query",
        required: false,
        schema: { type: "boolean", default: true },
        description: "Whether to serve from KV cache. Defaults to `true`. Pass `cache=false` to bypass the cache and fetch fresh data. The fresh result is then saved back to the cache.",
      },
    },
    responses: {
      BadRequest: {
        description: "Missing or invalid parameters",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Album not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      ServerError: {
        description: "Upstream fetch or parse error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
} as const;
