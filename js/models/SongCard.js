define(['provoda', 'spv', 'app_serv', 'js/libs/BrowseMap', './user_music_lfm'],
function(provoda, spv, app_serv, BrowseMap, user_music_lfm) {
'use strict';

var SongFansList = function(){};
user_music_lfm.LfmUsersList.extendTo(SongFansList, {
	init: function(opts, params) {
		this._super(opts);
		spv.cloneObj(this.init_states, params);
		this.initStates();
	},
	getRqData: function() {
		return {
			artist: this.state('artist_name'),
			track: this.state('track_name')
		};
	},
	sendMoreDataRequest: function(paging_opts, request_info) {
		return this.sendLFMDataRequest(paging_opts, request_info, {
			method: 'track.getTopFans',
			field_name: 'topfans.user',
			data: this.getRqData(),
			parser: this.friendsParser,
			no_paging: true,
			disallow_paging: true
		});
	}
});

var SongCard = function() {};
BrowseMap.Model.extendTo(SongCard, {
	model_name: 'songcard',
	init: function(opts, params) {
		this._super(opts);
		spv.cloneObj(this.init_states, params);
		this.sub_pa_params = {
			artist_name: params.artist_name,
			track_name: params.track_name
		};
		this.initStates();
	},
	'compx-nav_title': {
		depends_on: ['artist_name', 'track_name'],
		fn: function(artist_name, track_name) {
			return artist_name + ' - ' + track_name;
		}
	},
	initForSong: function() {

	},
	fullInit: function() {
		var artcard = this.app.getArtcard(this.state('artist_name'));
		if (artcard){
			this.updateNesting('artist', artcard);
		}
	},
	sub_pa: {
		'fans':{
			constr: SongFansList,
			title: 'Top fans'
		}
	}
});
return SongCard;
});