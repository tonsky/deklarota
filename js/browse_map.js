

var mapLevel = function(num, map, parent_levels, resident, getNavData){
	var _this = this;
	this.num = num;
	this.map = map;
	this.parent_levels = parent_levels;
	if (resident){
		this.resident = new resident();
		if (this.resident.nav){
			this.nav = this.resident.nav();
			this.nav.render(getNavData());
			this.nav.setClickCb(function(active){
				if (active){
					_this.map.goShallow(_this);
				}	
			})
		}
	}
	this.storage = {};
};
mapLevel.prototype = {
	setResident: function(resident){
		this.resident = resident;
	},
	D: function(key, value){
		if (!value){
			return this.storage[key];
		} else {
			this.storage[key] = value;
		}
	},
	getResident: function(){
		return this.resident;
	},
	getURL: function(){
		return this.url || '';
	},
	setURL: function(url){
		this.url = url || '';
	},
	testByURL: function(url){
		if (this.url == url){
			return this;
		}	
	},
	testByPlaylistPuppet: function(puppet){
		var pl = this.D('pl') || (this.getResident() && this.getResident().D && this.getResident().D('pl'));
		if (pl && pl.compare(puppet)){
			return this;
		}
	},
	testByQuery: function(query){
		var pl = this.D('pl') || (this.getResident() && this.getResident().D && this.getResident().D('pl'));
		if (pl && this.D('q') == query){
			return this;
		}	
	},
	getFullURL: function(){
		var u='';
		for (var i=0; i < this.parent_levels.length; i++) {
			u += this.parent_levels[i].getURL();
		};
		return u + this.getURL();
	},
	show: function(opts){
		var o = opts || {};
		o.closed = this.closed;
		this.resident.show(o);
		if (this.nav){
			//this.nav.show();
		}
		
	},
	hide: function(){
		this.resident.hide();
		if (this.nav){
			this.nav.hide();
		}
		
	},
	kill: function(){
		this.resident.kill();
		if (this.nav){
			this.nav.kill();
		}
		delete this.map;
	},
	sliceDeeper: function(){
		this.map.sliceToLevel(this.num, true)
	},
	freeze: function(){
		this.map.freezeMapOfLevel(this.num);
	},
	isOpened: function(){
		return !!this.map && !this.closed;
	}
	
};

function browseMap(mainLevelResident, getNavData){
	
	this.levels = [];
	this.getNavData = getNavData;
	this.mainLevelResident = mainLevelResident;
	
	//zoom levels
	
	// -1, not using, start page
	//0 - search results
	//1 - playlist page
	//today seesu has no deeper level
}
browseMap.prototype= {
	makeMainLevel: function(){
		this.setLevelPartActive(this.getFreeLevel(-1, false, this.mainLevelResident), {userwant: true});
	},
	getBothPartOfLevel: function(level_num){
		return {
			fr: this.levels[level_num] && this.levels[level_num].free != this.levels[level_num].freezed &&  this.levels[level_num].free,
			fz: this.levels[level_num] && this.levels[level_num].freezed 
		};
	},
	findURL: function(level, url, only_freezed, only_free){
		var both = this.getBothPartOfLevel(level);
		return (!only_freezed && !!both.fr && both.fr.testByURL(url)) || (!only_free && !!both.fz && both.fz.testByURL(url));
	},
	findLevelOfPlaylist: function(level, puppet, only_freezed){
		var both = this.getBothPartOfLevel(level);
		return (!only_freezed && !!both.fr && both.fr.testByPlaylistPuppet(puppet)) || (!!both.fz && both.fz.testByPlaylistPuppet(puppet));
	},
	findLevelOfSearchQuery: function(level, query){
		var both = this.getBothPartOfLevel(level);
		return (!!both.fr && both.fr.testByQuery(query)) || (!!both.fz && both.fz.testByQuery(query));
	},
	getLevel: function(num){
		if (this.levels[num]){
			return this.levels[num].free || this.levels[num].freezed;
		} else{
			return false;// maybe better return this.getFreeLevel(num);
		}
	},
	getActiveLevelNum: function(){
		return this.current_level_num;
	},
	setLevelPartActive: function(lp, opts){
		opts = opts || {};
		lp.show(opts);
		if (opts.userwant){
			this.updateNav(lp);
		}
		
		this.current_level_num = lp.num;
	},
	goShallow: function(to){ //up!
		this.sliceToLevel(to.num, true);
	},
	goDeeper: function(orealy, resident){
		var cl = this.getActiveLevelNum();
		if (orealy){
			this.sliceToLevel(cl, false, true);
		}  else{
			this.sliceToLevel(-1, false, true);
		}
		cl = this.getFreeLevel(orealy ? cl + 1 : 0, orealy, resident);
		this.setLevelPartActive(cl, {userwant: true});
		return cl;
		
	},
	getFreeLevel: function(num, save_parents, resident){//goDeeper
		var _this = this;
		if (!this.levels[num]){
			this.levels[num] = {};
		}
		if (this.levels[num].free && this.levels[num].free != this.levels[num].freezed){
			return this.levels[num].free;
		} else{
			var parent_levels = (function(){
				var lvls = [];
				
				//from deep levels to top levels;
				if (save_parents){
					for (var i = Math.min(_this.levels.length, num) - 1; i > -1; i--){
						lvls.push(_this.getLevel(i));
					};
				}
				return 	lvls;
			})();
			
			return this.levels[num].free = new mapLevel(num, this, parent_levels, resident, this.getNavData);
		}
	},
	freezeMapOfLevel : function(num){
		var fresh_freeze = false;
		var l = Math.min(num, this.levels.length - 1);
		for (var i = l; i >= 0; i--){
			if (this.levels[i]){
				if (this.levels[i].free){
					if (this.levels[i].free != this.levels[i].freezed){
						if (this.levels[i].freezed){ //removing old freezed
							this.levels[i].freezed.kill();
							delete this.levels[i].freezed;
						}
						this.levels[i].freezed = this.levels[i].free;
						this.levels[i].freezed.closed = true;
						fresh_freeze = true
					}	
				}
				delete this.levels[i].free;
			}
			
			
		};
		
		//clearing if have too much levels !?!?!??!?!?!
		if (l + 1 < this.levels.length -1) {
			for (var i= l + 1; i < this.levels.length; i++) {
				if (this.levels[i].freezed){
					this.levels[i].freezed.kill();
					delete this.levels[i].freezed
				}
				
			};
		}
		return fresh_freeze;
	},
	restoreFreezed: function(){
		this.hideMap();
		for (var i=0; i < this.levels.length; i++) {
			var cur = this.levels[i]
			if (cur){
				if (cur.freezed){
					this.setLevelPartActive(cur.freezed, {userwant: true});
				}
			}
		};
	},
	hideLevel: function(i){
		if (this.levels[i]){
			if (this.levels[i].freezed){ 
				this.levels[i].freezed.hide();
			}
			if (this.levels[i].free){
				this.levels[i].free.kill();
				delete this.levels[i].free;
			}
		}
	},
	hideMap: function(){
		for (var i=0; i < this.levels.length; i++) {
			this.hideLevel(i);
		};
	},
	updateNav: function(tl){
		var lvls = [].concat(tl.parent_levels);
		if (tl != this.getLevel(-1)){
			lvls.push(this.getLevel(-1));
		}
		lvls.reverse();
		tl.nav.setInactive();
		
		var prev = lvls.pop();
		if (prev){
			prev.nav.setActive();
		}
		if (lvls.length){
			while (lvls.length){
				lvls.pop().nav.hide();
			}
		}
		
	},
	sliceToLevel: function(num, fullhouse, transit){
		if (num < this.levels.length){
			for (var i = this.levels.length-1; i > num; i--){
				this.hideLevel(i);
			};
		}
		num = this.getLevel(num);
		if (num){
			this.setLevelPartActive(num, {userwant: fullhouse, transit: transit});
		}
	}
	
}