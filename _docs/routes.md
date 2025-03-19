- [Code organization](code-organization.md)

# Remix routes
`app/routes`

The code structure for routes mostly follow the standard Remix pattern. Please read Remix docs on those first.

https://remix.run/docs/en/main/route/action

We also use remix-flat-routes plugin to organize routes into folders.

In the routes folders, folder names ending with + are the ones handled by this plugin, and allow grouping routes in folders following url structure.

https://github.com/kiliman/remix-flat-routes


## Notes on specific routes

### API

Folder for routes that returns JSON or qr code image, not a regular remix data fetch results.

