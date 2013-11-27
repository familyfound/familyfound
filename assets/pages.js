
module.exports = exports = {
  nav: [
    {
      path: '/person/',
      match: true,
      name: 'Fan Chart'
    }, {
      path: '/find-relation/',
      match: true,
      name: 'How am I related?'
    }, {
      path: '/to-dos/',
      name: 'To-do List'
    }, {
      path: 'https://github.com/familyfound/familyfound/issues',
      name: 'Report a Problem',
      target: '_blank'
    /** }, {
      path: '/settings',
      icon: 'icon-cog'
    **/
    }, {
      path: 'https://github.com/familyfound/familyfound/',
      target: '_blank',
      icon: 'icon-github'
    }
  ],
  subNav: [
  ],
  routes: {
    '/to-dos/': 'TodoView',
    '/person/': 'PersonView',
    '/person/:id': 'PersonView',
    '/photos/': 'PhotosView',
    '/photos/:id': 'PhotosView',
    '/find-relation/': 'RelatedView',
    '/find-relation/:id': 'RelatedView'
    // '/settings': 'Settings'
  }
};

