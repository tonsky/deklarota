define(function(require) {
'use strict';
var $ = require('jquery');

var find = function(con, selector) {
  return $(con).find(selector)
}

var append = function(place, target) {
  $(place).append(target);
}

var prepend = function(place, target) {
  return $(place).prepend(target);
}

var after = function(place, target) {
  $(place).after(target)
}

var detach = function(target) {
  $(target).detach();
}

var before = function(place, comment_anchor) {
  $(place).before(comment_anchor);
}

var wrap = function(node) {
  return $(node);
}


var getText = function(node) {
  return $(node).text()
}

var setText = function(node, value) {
  return $(node).text(value);
}

var remove = function(node) {
  return $(node).remove();
}

return {
  find: find,
  append: append,
  prepend: prepend,
  after: after,
  detach: detach,
  before: before,
  wrap: wrap,
  getText: getText,
  setText: setText,
  remove: remove,
}

})
