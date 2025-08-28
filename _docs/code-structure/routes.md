- [Code structure](code-structure.md)

# Remix routes
`app/routes`

Follows standard Remix routing.

https://remix.run/docs/en/main/route/action

We also use remix-flat-routes plugin to organize routes into folders.

Folders ending with `+` are special, these are handled by this plugin and are grouped in folders with paths matching url structure.

https://github.com/kiliman/remix-flat-routes


## Notes on specific routes

### API

Contains routes that return JSON or QR code images, not standard Remix loader results.


