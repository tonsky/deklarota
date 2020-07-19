define(function(require) {
"use strict";

var spv = require('spv');
var pathExecutor = require('./routes/legacy/stringify')
var getParsedPath = require('./routes/legacy/getParsedPath')
var followStringTemplate = require('./routes/legacy/followStringTemplate')
var executeStringTemplate = require('./routes/legacy/executeStringTemplate')

var getTargetField = spv.getTargetField

var preloadStart = function (md) {
  md.preloadStart();
};

var executePreload = function(md, nesting_name) {
  var lists_list = md.getNesting(nesting_name);

  if (!lists_list) {return;}
  if (Array.isArray(lists_list)) {
    for (var i = 0; i < lists_list.length; i++) {
      var cur = lists_list[i];
      if (cur.preloadStart){
        md.useMotivator(cur, preloadStart);
      }

    }
  } else {
    if (lists_list.preloadStart){
      md.useMotivator(lists_list, preloadStart);
    }
  }
};


//если есть состояние для предзагрузки
//если изменилось гнездование

var bindPreload = function(md, preload_state_name, nesting_name) {
  md.lwch(md, preload_state_name, function(state) {
    if (state) {
      executePreload(md, nesting_name);
    }
  });
};

var getPathBySimpleData = pathExecutor(function(chunkName, app, data) {
  return data && getTargetField(data, chunkName);
});


var getSPByPathTemplateAndData = function (app, start_md, string_template, need_constr, data, strict, options, extra_states) {
  var parsed_template = getParsedPath(string_template);
  var full_path = getPathBySimpleData(parsed_template, app, data);
  return followStringTemplate(app, start_md, parsed_template, need_constr, full_path, strict, options, extra_states);
};

var getSPByPathTemplate = function(app, start_md, string_template, need_constr, md_for_urldata) {
  var parsed_template = getParsedPath(string_template);
  return executeStringTemplate(app, start_md, parsed_template, need_constr, md_for_urldata);
};

var getSubPByDeclr = function(md, cur) {
  if (cur.type == 'route') {
    return getSPByPathTemplate(md.app, md, cur.value);
  } else {
    var constr = md._all_chi[cur.key];
    return md.initSi(constr);
  }
};

var getSubpages = function(md, el) {
  var array = el.subpages_names_list;
  var result;
  if (Array.isArray( array )) {
    result = new Array(array);
    for (var i = 0; i < array.length; i++) {
      result[i] = getSubPByDeclr(md, array[i]);
    }
  } else {
    result = getSubPByDeclr(md, array);
  }
  return result;
};

var initOneDeclaredNesting = function(md, el) {
  /*
  nesting_name
  subpages_names_list
  preload
  idle_until


  subpages_names_list: ...cur[0]...,
  preload: cur[1],
  idle_until: cur[2]
  */

  if (el.preload_on) {
    bindPreload(md, el.preload_on, el.nesting_name);
  }


  if (!el.idle_until) {
    if (!md.getNesting(el.nesting_name)) {
      md.updateNesting(el.nesting_name, getSubpages( md, el ));
    }
    return
  }

  var init_func = function(state) {
    if (!state) {
      return
    }

    if (!this.getNesting(el.nesting_name)) {
      this.updateNesting(el.nesting_name, getSubpages( this, el ));
    }

    if (el.preload_on && this.state(el.preload_on)) {
      executePreload(this, el.nesting_name);
    }

    md.removeLwch(md, el.idle_until, init_func)
  };

  md.lwch(md, el.idle_until, init_func)

};

var initDeclaredNestings = function(md) {
  for (var i = 0; i < md.nestings_declarations.length; i++) {
    initOneDeclaredNesting(md, md.nestings_declarations[i]);
  }
};

initDeclaredNestings.getSubpages = getSubpages;
initDeclaredNestings.pathExecutor = pathExecutor;
initDeclaredNestings.executeStringTemplate = executeStringTemplate;


initDeclaredNestings.getConstrByPath = function(app, md, string_template) {
  return getSPByPathTemplate(app, md, string_template, true);
};
initDeclaredNestings.getSPByPathTemplate = getSPByPathTemplate;
initDeclaredNestings.getSPByPathTemplateAndData = getSPByPathTemplateAndData;

return initDeclaredNestings;
});
