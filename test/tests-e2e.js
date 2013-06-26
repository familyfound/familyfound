
var expect = require('chai').expect
  , angular = require('angularjs')
  , query = require('query')
  , keys = require('keys')
  , note = require('note');

var bootstrap = function (templateId, mainModule) {
  var src = document.getElementById(templateId).innerHTML;
  var parent = document.createElement('div');
  parent.innerHTML = src;
  var node = parent.firstElementChild;
  document.body.appendChild(node);
  angular.bootstrap(node, [mainModule]);
  return node;
};

after(function(){
  // bootstrap('template', 'test');
});

// doesnt work in phantomjs :(
var keyme = function (node, name) {
  var e = new Event('keydown');
  var attrs = keys.serialize(name);
  if (!attrs) throw new Error('bad key name: ' + name);
  Object.keys(attrs).forEach(function(key){
    e[key] = attrs[key];
  });
  node.dispatchEvent(e);
};

var keyyou = function (name) {
  var attrs = keys.serialize(name);
  attrs.preventDefault = function(){};
  attrs.stopPropagation = function(){};
  return attrs;
};
var getTitle = function (node, num) {
  return query.all('.title', node)[num];
};
var isFocused = function (node, num) {
  var title = getTitle(node, num);
  expect('' + document.activeElement).to.equal('' + title);
  expect(document.activeElement === title).to.be.true;
};

describe('note guy', function(){
  var node, injector;
  beforeEach(function(){
    node = bootstrap('template', 'test');
    injector = angular.element(node).injector();
  });
  afterEach(function(){
    node.parentNode.removeChild(node);
    injector = undefined;
  });
    
  it('should load, having a head and a body', function(){
    var head = query('.head', node)
      , body = query('.body', node);
    expect(head).to.be.ok;
    expect(body).to.be.ok;
  });

  it('should have 10 titles', function(){
    var titles = query.all('.title', node);
    expect(titles.length).to.eql(10);
  });

  describe('when the second item of a flat list of 9 is focused', function(){
    var title, $title, settings;
    beforeEach(function(){
      title = query.all('.title', node)[2];
      $title = angular.element(title);
      title.focus();
      settings = injector.get('settings');
    });
    describe('and the down key is pressed', function(){
      beforeEach(function(){
        $title.scope().keydown['nav.goDown']();
      });
      it('should focus the next one', function(){
        isFocused(node, 3);
      });
    });
    describe('and the up key is pressed', function(){
      beforeEach(function(){
        $title.scope().keydown['nav.goUp']();
      });
      it('should focus the previous one', function(){
        isFocused(node, 1);
      });
    });

    describe('and the tab key is pressed', function(){
      var ctitle, note, ptitle, pnote;
      beforeEach(function(){
        ptitle = angular.element(getTitle(node, 1));
        pnote = ptitle.scope().note;
        note = $title.scope().note;
        $title.scope().keydown['nav.moveRight']();
        ctitle = getTitle(node, 2);
      });
      it('should stay focused', function(){
        isFocused(node, 2);
      });
      it('should have the same note', function(){
        expect(angular.element(ctitle).scope().note).to.eql(note);
      });
      it('should now be the first child of the previous el', function(){
        expect(pnote.children[0]).to.eql(note);
      });
    });
  });
  describe('when a first sub-child is selected', function(){
    var title, $title, settings;
    beforeEach(function(){
      title = query.all('.title', node)[7];
      $title = angular.element(title);
      title.focus();
      settings = injector.get('settings');
    });
    describe("and it's moved left", function(){
      var ctitle, note, ptitle, pnote;
      beforeEach(function(){
        ptitle = angular.element(getTitle(node, 0));
        pnote = ptitle.scope().note;
        note = $title.scope().note;
        $title.scope().keydown['nav.moveLeft']();
        ctitle = getTitle(node, 7);
      });
      it("should be a child (in the right place) of the parent's parent", function(){
        expect(pnote.children[6]).to.equal(note);
      });
    });
  });

  // TODO: record functionality for moving up and down the tree
});

