
// client-side

var request = require('superagent')
  , dialog = require('dialog');

function showDialog(url) {
  var node = document.createElement('iframe');
  node.src = url + '&template=mobile';
  return dialog(node)
    .addClass('login-modal')
    .modal()
    .show();
}

module.exports = {
  check: function (next) {
    // return showDialog("hello");
    request.get('/oauth/check-login', function (err, res) {
      if (err) return next(err);
      if (res.body.error) return next(res.body.error);
      if (res.body.authorized) return next(null, res.body.data);
      var dialog;
      window.authCallback = function (res) {
        dialog.hide();
        if (res.err) return next(res.err);
        if (!res.authorized) return next('Unauthorized');
        return next(null, res.data);
      };
      dialog = showDialog(res.body.url);
    });
  }
};
