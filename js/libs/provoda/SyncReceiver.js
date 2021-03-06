define(function(require) {
'use strict';
var spv = require('spv')
var MDProxy = require('./MDProxy');
var CH_GR_LE = 2

var slice = Array.prototype.slice;

var FakeModel = function(model_skeleton, stream) {
  this.stream = stream;
  this._provoda_id = model_skeleton._provoda_id;

  this.children_models = model_skeleton.children_models;
  this.map_level_num = model_skeleton.map_level_num;
  this.map_parent = model_skeleton.map_parent;
  this.hierarchy_num = model_skeleton.hierarchy_num
  this.constr_id = model_skeleton.constr_id
  this.model_name = model_skeleton.model_name;
  this.mpx = model_skeleton.mpx;
  this.states = model_skeleton.states;
  this.md_replacer = null;
  Object.seal(this)
};

var MDReplace = function(_provoda_id){
  this._provoda_id = _provoda_id
};

FakeModel.prototype = {
  _assignPublicAttrs: function(target) {
    return spv.cloneObj(target, this.states)
  },
  getParentMapModel: function() {
    return this.map_parent;
  },
  RealRemoteCall: function(arguments_obj) {
    this.stream.RPCLegacy(this._provoda_id, slice.call(arguments_obj));
  },
  RPCLegacy: function() {
    this.RealRemoteCall(arguments);
  },
  getMDReplacer: function() {
    if (!this.md_replacer) {
      this.md_replacer = new MDReplace(this._provoda_id);
    }
    return this.md_replacer;
  },
};


var idToModel = function(index, ids) {
  if (typeof ids == 'number'){
    return index[ids];
  } else if (Array.isArray(ids)) {
    var result = new Array(ids.length);
    for (var i = 0; i < ids.length; i++) {
      result[i] = index[ids[i]];

    }
    return result;
  } else {
    /*if (ids){
      debugger;
    }*/

    return ids;
  }
};


var SyncReceiver = function(stream){
  this.stream = stream;
  this.md_proxs_index = {};
  this.models_index = {};

};

SyncReceiver.prototype = {

  buildTree: function(array) {
    var i, cur, cur_pvid;

    for (i = 0; i < array.length; i++) {
      cur = array[i];
      cur_pvid = cur._provoda_id;
      if (!this.models_index[cur_pvid]){
        this.models_index[cur_pvid] = new FakeModel(cur, this.stream);
      }
      //резервируем объекты для моделей
      //big_index[cur_pvid] = true;
      //^_highway.models[cur_pvid] = true;
    }

    for (i = 0; i < array.length; i++) {
      //восстанавливаем связи моделей
      cur_pvid = array[i]._provoda_id;
      cur = this.models_index[cur_pvid];
      cur.map_parent = idToModel(this.models_index, cur.map_parent);
      for (var nesting_name in cur.children_models) {
        cur.children_models[nesting_name] = idToModel(this.models_index, cur.children_models[nesting_name]);

      }

    }


    for (i = 0; i < array.length; i++) {
      //создаём передатчики обновлений во вьюхи
      cur = array[i];
      cur_pvid = cur._provoda_id;
      if (!this.md_proxs_index[cur_pvid]){
        this.md_proxs_index[cur_pvid] = new MDProxy(cur._provoda_id, cur.children_models, this.models_index[cur_pvid]);
        this.models_index[cur_pvid].mpx = this.md_proxs_index[cur_pvid];
      }
    }
    return array.length && this.models_index[array[0]._provoda_id];
  },
  actions: {
    buildtree: function(message) {
      return this.buildTree(message.value);
    },
    update: function(list) {
      for (var i = 0; i < list.length; i++) {
        var cur = list[i]
        var change_name = cur[0]
        switch (change_name) {
          case "state-ch": {
            this.updateStates(cur[1], cur[2])
            continue
          }
          case "nest-ch": {
            this.updateNesting(cur[1], cur[2], cur[3], cur[4])
          }
        }
      }
    },
    update_states: function(message) {
      this.updateStates(message._provoda_id, message.value)
    },
    update_nesting: function(message) {
      this.updateNesting(message._provoda_id, message.struc, message.name, message.value)
    }
  },
  updateStates: function(_provoda_id, value) {
    var target_model = this.models_index[_provoda_id];

    for (var i = 0; i < value.length; i+=CH_GR_LE) {
      var state_name = value[ i ];
      var state_value = value[ i +1];
      target_model.states[state_name] = state_value;
    }


    this.md_proxs_index[_provoda_id].stackReceivedStates(value);

  },
  updateNesting: function(_provoda_id, struc, name, value) {
    if (struc) {
      this.buildTree(struc);
    }

    var target_model = this.models_index[_provoda_id];
    var target_md_proxy = this.md_proxs_index[_provoda_id];

    var fakes_models = idToModel(this.models_index, value);


    target_model.children_models[name]= fakes_models;
    //target_md_proxy.children_models[name] = fakes_models;
    target_md_proxy.sendCollectionChange(name, fakes_models);
  },
};
return SyncReceiver;
});
