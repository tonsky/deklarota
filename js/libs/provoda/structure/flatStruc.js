define(function(require) {
'use strict';
var spv = require('spv');
var hp = require('../helpers');
var get_constr = require('./get_constr');


var getEncodedState = hp.getEncodedState;
var getNestingConstr = get_constr.getNestingConstr;

var modelInfo = function(md)  {
  if (typeof md == 'function') {
    return md.prototype
  }

  return md
}


var getNestReq = function(md, nest_name) {
  return modelInfo(md)._nest_reqs && modelInfo(md)._nest_reqs[nest_name];
}
var getNestConstr = function(md, nest_name) {
  return modelInfo(md)._nest_rqc && modelInfo(md)._nest_rqc[nest_name]
}

var dep_counter = 1;

function NestingDep (path, needed, nesting_path, limit) {
  this.dep_id = dep_counter++
  this.type = 'nesting'
  this.value = path
  this.needed = needed
  this.nesting_path = nesting_path
  this.limit = limit
}

var preciseNesting = function(app, array, path, original_need) {
  var index = {};
  for (var i = 0; i < array.length; i++) {
    var cur = array[i].prototype;

    var dep = new NestingDep(path, original_need)

    var checked = checkNestingPath(app, cur, dep, path, original_need);
    index[cur.constr_id] = chechTreeStructure(app, cur, checked);
  }
  return {
    dep_id: dep_counter++,
    type: 'precise_nesting',
    value: index
  };
};

function checkNestingPath(app, md, dep, path, original_need) {
  var result = [];
  var cur = md;

  for (var i = 0; i < path.length; i++) {
    var nesting_name = path[i];

    var constr = getNestingConstr(modelInfo(app), cur, nesting_name);
    var right_nesting_name = hp.getRightNestingName(cur, nesting_name);
    if (!constr) {
      console.log('no const', nesting_name);
      break;
    }

    var type;
    var declr = getNestReq(cur, right_nesting_name);
    if (declr || getNestConstr(cur, right_nesting_name)) {
      type = 'countless';
    } else if (Array.isArray(constr)){
      // `posbl_` could lead to incorrect type
      type = 'finite';
    } else {
      type = 'single';
    }

    var item = {
      name: nesting_name,
      type: type,
      constr: constr,
      related: null
    };

    if (type == 'countless') {
      var countless_nesting_dep = {
        dep_id: dep_counter++,
        type: 'countless_nesting',
        value: right_nesting_name,
        state: null,
        related: null,
        limit: dep.limit
      };

      if (declr && declr.state_dep) {

        var state_dep = chechTreeStructure(app, cur, {
          dep_id: dep_counter++,
          type: 'state',
          value: declr.state_dep
        });

        if (state_dep.related && state_dep.related.length) {
          countless_nesting_dep.state = declr.state_dep;
          countless_nesting_dep.related = state_dep;
        }
      }

      item.related = countless_nesting_dep;
    }

    result.push(item);

    if (item.type == 'finite') {
      return new NestingDep(
        path.slice(0, i),
        [preciseNesting(app, constr, path.slice(i), original_need)],
        result
      );
    }

    cur = constr.prototype;
    dep.last_constr = constr;
  }

  dep.nesting_path = result;

  return dep;
};

var relatedDeps = function(app, md, state_name) {
  var short_name = hp.getShortStateName(state_name);

  var is_compx_state = modelInfo(md).hasComplexStateFn(short_name);
  if (!is_compx_state) {
    return null;
  }
  var dependence_list = modelInfo(md).compx_check[short_name].watch_list;


  var related = [];

  for (var i = 0; i < dependence_list.length; i++) {
    var cur = dependence_list[i];
    if (state_name == cur) {
      continue;
    }

    var conv = chechTreeStructure(app, md, {
      dep_id: dep_counter++,
      type: 'state',
      value: cur
    });

    if (conv) {
      related.push(conv);
    }

  }

  return related;
};

var convertEncoded = function(enc) {
  var needed = [{
    dep_id: dep_counter++,
    type: 'state',
    value: enc.state_name
  }];

  switch (enc.rel_type) {
    case 'root': {
      return {
        dep_id: dep_counter++,
        type: enc.rel_type,
        needed: needed
      };
    }
    break;
    case 'nesting': {
      return {
        dep_id: dep_counter++,
        type: enc.rel_type,
        value: enc.nwatch.selector,
        needed: needed
      };
    }
    break;
    case 'parent': {
      return {
        dep_id: dep_counter++,
        type: enc.rel_type,
        value: enc.ancestors,
        needed: needed
      };
    }
    break;
  }
};

var getRelated = function(app, md, needed) {
  var related = [];

  for (var i = 0; i < needed.length; i++) {
    related.push(chechTreeStructure(app, md, needed[i]));
  }

  return related;
};

function chechTreeStructure(app, md, dep) {
  if (dep.type == 'state') {
    var enc = getEncodedState(dep.value);
    if (!enc) {
      if (dep.needed) {
        console.log(new Error('should not be `needed` here'));
      }
      var short_name = hp.getShortStateName(dep.value);
      var can_request = modelInfo(md)._states_reqs_index && modelInfo(md)._states_reqs_index[short_name];
      if (can_request) {
        dep.can_request = true;
        return dep;
      }

      dep.related = relatedDeps(app, md, dep.value);
      return dep;
    } else {
      return chechTreeStructure(app, md, convertEncoded(enc));
    }
  } else if (dep.type == 'nesting') {
    var nesting_dep = dep;
    var last_constr_md = !dep.value.length && md;

    if (!last_constr_md) {
      nesting_dep = checkNestingPath(app, md, dep, dep.value, dep.needed);
      last_constr_md = nesting_dep.last_constr && nesting_dep.last_constr.prototype;
      if (!last_constr_md) {
        return dep;
      }
    }

    if (!nesting_dep.needed) {
      return nesting_dep; // !? what
    }

    nesting_dep.related = getRelated(app, last_constr_md, nesting_dep.needed);
    return nesting_dep;
  } else if (dep.type == 'parent') {

    var parent_md;
    for (var i = 0; i < dep.value; i++) {
      parent_md = modelInfo(md)._parent_constr.prototype;
    }
    dep.related = getRelated(app, parent_md, dep.needed);
    return dep;

  } else if (dep.type == 'root') {
    dep.related = getRelated(app, modelInfo(md)._root_constr.prototype, dep.needed);
    return dep;
  }

  return dep;
};

function flatStruc(md, struc, appArg) {
  var result = [];

  var app = appArg || md.app;

  var list = flatSources(struc);
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) {
      continue;
    }

    var item = chechTreeStructure(app, md, list[i]);
    if (item) {
      result.push(item);
    }
  }
  console.log(result);
  return result;
}
var result = spv.memorize(flatStruc, function(md) {
  return modelInfo(md).constr_id;
});

result.flatStruc = flatStruc

return result;

function flatSources(struc, parent_path) {
  if (!struc || !struc.main) {return;}

  var result_list = [];

  var parent = parent_path || [];

  var needed = [];

  for (var i = 0; i < struc.main.merged_states.length; i++) {
    var state_name = struc.main.merged_states[i];
    needed.push({
      dep_id: dep_counter++,
      type: 'state',
      value: state_name
    });
  }

  result_list.push(new NestingDep(parent, needed, null, struc.main.limit));

  var obj = struc.main.m_children.children;
  for (var name in obj) {
    var copy = parent.slice();
    copy.push(name);
    var path = copy;

    result_list.push(new NestingDep(path, null, null, obj[name].main && obj[name].main.limit));

    result_list.push.apply(result_list, flatSources(obj[name], path));
  }

  return result_list;
}

});
