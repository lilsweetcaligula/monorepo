const Express = require('express')
const Path = require('path')
const Shared = require('../../lib/shared')
const { pick } = Shared


//
// TODO: Remove this once Auth has been implemented.
//
const TEST_USER_AUTH_TOKEN = '2bfe7bbc-d6d0-4d3a-b694-579ff642ebb4'


function web(options) {
  const seneca = this


  /* TODO: Implement the hybrid approach to allow hot-reloading. See the
   * following links for more information:
   *
   *   https://stackoverflow.com/questions/33385288/do-i-need-webpack-dev-server-if-i-am-using-a-node-server-like-express
   *   https://stackoverflow.com/questions/26203725/how-to-allow-for-webpack-dev-server-to-allow-entry-points-from-react-router
   */

  const app = Express()


  app.use(Express.json())


  const VIEWS_PATH = Path.join(__dirname, 'www', 'dist')
  app.use(Express.static(VIEWS_PATH))


  app.get('/*', (req, res) => {
    const index = Path.join(VIEWS_PATH, 'index.html')
    return res.sendFile(index)
  })


  app.post('/seneca/listPkgsWithNamePrefix', (req, res, next) => {
    const { prefix = null } = req.body

    if ('string' !== typeof prefix) {
      return res.sendStatus(422)
    }

    const msg = {
      q: {
        name: { starts_with$: prefix }
      }
    }

    seneca.act('role:search,fake_search:query', msg, (err, out) => {
      if (err) {
        return next(err)
      }

      if (!out.ok) {
        return res.sendStatus(500)
      }

      const { data: { pkgs } } = out
      const pkgs_names = pkgs.map(pkg => pick(pkg, ['name']))

      return res.json({ pkgs: pkgs_names })
    })
  })


  app.post('/seneca/showPkg', (req, res, next) => {
    const { name: pkg_name } = req.body

    if (null == pkg_name) {
      return res.sendStatus(422)
    }

    const msg = { name: pkg_name }

    seneca.make('nodezoo', 'npm')
      .load$({ name: pkg_name }, function (err, pkg) {
        if (err) {
          return next(err)
        }

        return res.json({ pkg: pick(pkg, ['name']) })
      })
  })


  app.post('/seneca/doBookmarkPkg', (req, res, next) => {
    //
    // TODO: !!! AUTH !!!
    //

    const { name: pkg_name } = req.body

    if (null == pkg_name) {
      return res.sendStatus(422)
    }

    const msg = { auth_token: TEST_USER_AUTH_TOKEN, name: pkg_name }

    seneca.act('role:user,scope:pkg,add:bookmark', msg, function (err, out) {
      if (err) {
        return next(err)
      }

      if (!out.ok) {
        return res.sendStatus(500)
      }

      return res.sendStatus(201)
    })
  })


  app.post('/seneca/listMyBookmarkedPkgs', (req, res, next) => {
    //
    // TODO: !!! AUTH !!!
    //

    const msg = { auth_token: TEST_USER_AUTH_TOKEN }

    seneca.act('role:user,scope:pkg,list:bookmarks', msg, function (err, out) {
      if (err) {
        return next(err)
      }

      const { bookmarks } = out.data

      // TODO: Fetch packages' data.
      //

      const pkgs_names = bookmarks.map(b => pick(b, ['name']))

      return res.json({ pkgs: pkgs_names })
    })
  })


  app.use((err, req, res, next) => {
    console.error(err)
    return res.sendStatus(500)
  })


  app.listen(8080)
}


module.exports = web
