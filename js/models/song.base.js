(function() {
"use strict";
var counter = 0;

provoda.addPrototype("baseSong",{
	model_name: "song",
	init: function(opts, params){

		this._super();
		this.plst_titl = opts.plst_titl;
		this.mp3_search = opts.mp3_search;
		this.player = opts.player;
		
		this.uid = ++counter;
		cloneObj(this, opts.omo, false, ['artist', 'track']);
		this.omo = opts.omo;
		if (opts.omo.artist){
			this.updateState('artist', opts.omo.artist);
		}
		if (opts.omo.track){
			this.updateState('track', opts.omo.track);
		}
		this.on('request', function(rq) {
			this.plst_titl.checkRequestsPriority();
		});
		this.updateState('url-part', this.getURL());
	},
	complex_states: {
		'song-title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		'full-title': {
			depends_on: ['artist', 'track'],
			fn: function(artist, track){
				return this.getFullName(artist, track);
			}
		},
		is_important: {
			depends_on: ['mp-show', 'player-song', 'want_to_play'],
			fn: function(mp_show, player_song, wapl){
				this.plst_titl.checkRequestsPriority();
				return !!(mp_show || player_song || wapl);

			}
		}
	},
	state_change: {
		"mp-show": function(opts) {
			if (opts){
				this.prepareForPlaying();
				
				
			} else {
				this.removeMarksFromNeighbours();
			}
		},
		"player-song": function(state){
			var _this = this;

			if (state){
				setTimeout(function() {
					if (!_this.state("mp-show") && _this.state('search-complete')){
						
						_this.checkNeighboursChanges(false, false, "player song");
					}
					
				}, 0);
				
				
				
				this.mp3_search.on("new-search.player-song", function(){
					_this.findFiles();
					_this.checkNeighboursChanges(false, false, "new search, player song");
					if (_this.next_preload_song){
					//	_this.next_preload_song.findFiles();
					}
				}, {exlusive: true});
			}
		},
		"is_important": function(state){
			if (!state){
				this.unloadFor(this.uid);

				cloneObj(this, {
					next_song: false,
					prev_song: false,
					next_preload_song: false
				});
			}
		}
	},
	prepareForPlaying: function() {
		var _this = this;

		this.makeSongPlayalbe(true);
		setTimeout(function() {
			_this.checkNeighboursChanges(false, true, "track view");
		}, 0);
		this.mp3_search.on("new-search.viewing-song", function(){
			_this.findFiles();
			_this.checkNeighboursChanges(false, true, "track view");
		}, {exlusive: true});
	},
	simplify: function() {
		return cloneObj({}, this, false, ['track', 'artist']);
	},
	
	mlmDie: function() {
		
	},
	getFullName: function(artist, track, allow_short){
		var n = '';
		if (this.artist){
			if (this.track){
				if (allow_short && this.plst_titl && (this.plst_titl.info && this.plst_titl.info.artist == this.artist)){
					n = this.track;
				} else {
					n = this.artist + " - " + this.track;
				}
			} else {
				n = this.artist;
			}
		} else if (this.track){
			n = this.track;
		}
		return n || 'no title';
	},
	updateNavTexts: function() {
		var title = this.state('full-title');
		this.updateState('nav-title', title);
	},
	playNext: function(auto) {
		if (this.state('rept-song')){
			this.play();
		} else {
			this.plst_titl.switchTo(this, true, auto);
		}
		
	},
	playPrev: function() {
		this.plst_titl.switchTo(this);
	},
	findNeighbours: function(){
		this.plst_titl.findNeighbours(this);
	},
	checkAndFixNeighbours: function(){
		this.findNeighbours();
		this.addMarksToNeighbours();
	},
	/*
	downloadLazy: debounce(function(){
		var song = getTargetField(this.mf_cor.songs(), "0.t.0");
		if (song){
			downloadFile(song.link);
		}
	}, 200),*/
	canPlay: function() {
		return this.mf_cor.canPlay();
	},
	preloadFor: function(id){
		this.mf_cor.preloadFor(id);
	},
	unloadFor: function(id){
		this.mf_cor.unloadFor(id);
	},
	setVolume: function(vol, fac){
		this.mf_cor.setVolume(vol, fac);
	},
	stop: function(){
		this.mf_cor.stop();
	},
	switchPlay: function(){
		this.mf_cor.switchPlay();
	},
	pause: function(){
		this.mf_cor.pause();
	},
	play: function(mopla){
		this.mf_cor.play(mopla);

	},
	markAs: function(neighbour, mo){
		if (!this.neighbour_for){
			this.neighbour_for = mo;
			this.updateState('marked_as', neighbour);
		}
	},
	unmark: function(mo){
		if (this.neighbour_for == mo){
			delete this.neighbour_for;
			this.updateState('marked_as', false);

		}
	},
	wasMarkedAsPrev: function() {
		return this.state('marked_as') && this.state('marked_as') == 'prev';
	},
	wasMarkedAsNext: function() {
		return this.state('marked_as') && this.state('marked_as') == 'next';
	},
	addMarksToNeighbours: function(){
		
		if (!this.marked_prev_song || this.marked_prev_song != this.prev_song){
			if (this.marked_prev_song){
				this.marked_prev_song.unmark(this);
			}
			if (this.prev_song){
				(this.marked_prev_song = this.prev_song).markAs('prev', this);
			}
		}
		if (!this.marked_next_song || this.marked_next_song != this.next_song){
			if (this.marked_next_song){
				this.marked_next_song.unmark(this);
			}
			if (this.next_song){
				(this.marked_next_song = this.next_song).markAs('next', this);
			}
		}
			
		
	},
	removeMarksFromNeighbours: function(){
		if (this.marked_prev_song){
			this.marked_prev_song.unmark(this);
			delete this.marked_prev_song;
		}
		if (this.marked_next_song){
			this.marked_next_song.unmark(this);
			delete this.marked_next_song;
		}
	},
	waitToLoadNext: function(ready){
		this.ready_to_preload = ready;
		if (ready){
			if (!this.waiting_to_load_next && this.player.c_song == this && this.next_preload_song){
				var nsong = this.next_preload_song;
				var uid = this.uid;
				this.waiting_to_load_next = setTimeout(function(){
					nsong.preloadFor(uid);
				}, 4000);
			}
		} else if (this.waiting_to_load_next){
			clearTimeout(this.waiting_to_load_next);
			delete this.waiting_to_load_next;
		}
	},
	isImportant: function() {
		return this.state('is_important');
	},
	canUseAsNeighbour: function(){
		return (this.canSearchFiles() && (this.canPlay() || !this.state('search-complete'))) || (!this.track && this.canFindTrackTitle());
	},
	checkNeighboursChanges: function(changed_neighbour, viewing, log) {
		this.plst_titl.checkNeighboursChanges(this, changed_neighbour, viewing, log);
	},
	hasNextSong: function(){
		return !!this.next_song;
	},
	canFindTrackTitle: function() {
		return !this.state("no-track-title");
	},
	setSongName: function(song_name, full_allowing, from_collection, last_in_collection) {
		this.track = song_name;
		this.updateState('track', song_name);
		this.updateNavTexts();

		this.findFiles({
			only_cache: !full_allowing,
			collect_for: from_collection,
			last_in_collection: last_in_collection
		});
		this.updateState('url-part', this.getURL());
	},
	getRandomTrackName: function(full_allowing, from_collection, last_in_collection){
		this.updateState('track-name-loading', true);
		var _this = this;

		/*
		инфа из лфм +


		треки ex.fm  +
		треки в sc +
		треки lfm +


		есть ли профиль в sc
		*/
		


		if (!this.track && !this.rtn_request){
			var $ = window.$;

			var all_requests = [];
			var can_search_wide = !!this.mp3_search.getSearchByName('vk');


			var def_top_tracks = $.Deferred();
			




			var
				def_podcast,
				def_soundcloud,
				def_exfm;

			


			
			all_requests.push(def_top_tracks);
			this.addRequest(lfm.get('artist.getTopTracks',{'artist': this.artist, limit: 30, page: 1 })
				.done(function(r){
					var tracks_list = toRealArray(getTargetField(r, 'toptracks.track'));
					var tracks_list_clean = [];
					for (var i = 0; i < tracks_list.length; i++) {
						var cur = tracks_list[i];
						tracks_list_clean.push({
							artist: cur.artist.name,
							track: cur.name
						});
					}

					def_top_tracks.resolve(tracks_list_clean);
					
				})
				.fail(function() {
					def_top_tracks.resolve();
				}));



			if (!can_search_wide){
				def_podcast = $.Deferred();
				def_soundcloud = $.Deferred();
				def_exfm = $.Deferred();


				all_requests.push(def_podcast);
				this.addRequest(lfm.get('artist.getPodcast', {artist: this.artist})
					.done(function(r) {
						var tracks_list = toRealArray(getTargetField(r, 'rss.channel.item'));
						var tracks_list_clean = [];
						var files_list = [];
						for (var i = 0; i < tracks_list.length; i++) {
							var cur = tracks_list[i];
							var link = decodeURI(cur.link);
							var parts = link.split('/');
							var track_name = parts[parts.length-1];
							tracks_list_clean.push({
								artist: _this.artist,
								track: track_name
							});
							files_list.push({
								link: link,
								artist: _this.artist,
								track: track_name,
								from:'lastfm',
								media_type: 'mp3'
							});

						}
						_this.mp3_search.pushSomeResults(files_list);
						def_podcast.resolve(tracks_list_clean);
					})
					.fail(function() {
						def_podcast.resolve();
					}));



				var pushMusicList = function(music_list, deferred_obj) {
					var filtered = [];

					for (var i = 0; i < music_list.length; i++) {
						var cur = music_list[i];
						var qmi = _this.mp3_search.getFileQMI(cur, {artist: _this.artist});
						if (qmi != -1){
							if (cur.artist && cur.artist.toLowerCase() == _this.artist.toLowerCase()){
								if (qmi < 20){
									filtered.push(cur);
								}
							}
						}
					}
					_this.mp3_search.pushSomeResults(music_list);

					deferred_obj.resolve(filtered);
				};

				all_requests.push(def_soundcloud);
				var sc_search = this.mp3_search.getSearchByName('soundcloud');
				if (!sc_search){
					def_soundcloud.resolve();
				} else {
					this.addRequest( sc_search.findAudio({artist: this.artist})
						.done(function(music_list) {
							pushMusicList(music_list, def_soundcloud);
							//var music_list_filtered =
						})
						.fail(function() {
							def_soundcloud.resolve();
						})
					);
				}


				all_requests.push(def_exfm);
				var exfm_search = this.mp3_search.getSearchByName('exfm');
				if (!exfm_search){
					def_exfm.resolve();
				} else {
					this.addRequest(   exfm_search.findAudio({artist: this.artist})
						.done(function(music_list) {
							pushMusicList(music_list, def_exfm);
						})
						.fail(function() {
							def_exfm.resolve();
						})
					);
				}
			}


			var any_track_with_file = Math.round(Math.random());


			var big_request = this.rtn_request = $.when.apply($.when, all_requests)
				.done(function(top_tracks, podcast, sc_list, exfm_list) {
					if (_this.track){
						return;
					}
					top_tracks = top_tracks && top_tracks.length && top_tracks;

					var selectRandomTrack = function(tracks_list) {
						if (tracks_list && tracks_list.length){
							var some_track = tracks_list[Math.floor(Math.random()*tracks_list.length)];
							_this.setSongName(some_track.track, full_allowing, from_collection, last_in_collection);
						} else {
							_this.updateState("no-track-title", true);
							
						}

						
					};

					if (!can_search_wide){
						var all_with_files = [];
						
						if (podcast && podcast.length){
							all_with_files = all_with_files.concat(podcast);
						}
						if (sc_list && sc_list.length){
							all_with_files = all_with_files.concat(sc_list);
						}
						if (exfm_list && exfm_list.length){
							all_with_files = all_with_files.concat(exfm_list);
						}

						var single_files_store = makeIndexByField(all_with_files, 'track');
						var single_tracks_list = [];
						for (var track_name in single_files_store){
							single_tracks_list.push({
								artist: _this.artist,
								track: track_name
							});
						}

						if (any_track_with_file){
							if (single_tracks_list.length){
								selectRandomTrack(single_tracks_list);
							} else {
								selectRandomTrack(top_tracks);
							}
							
						} else {
							
							var top_index = makeIndexByField(top_tracks, 'track');
							var both_match_tracks_list = [];
							for (var track_name in top_index){
								if (single_files_store[track_name]){
									both_match_tracks_list.push({
										artist: _this.artist,
										track: track_name
									});
								}
							}
							if (both_match_tracks_list.length){
								selectRandomTrack(both_match_tracks_list);
							} else if (single_tracks_list.length) {
								selectRandomTrack(single_tracks_list);
							} else {
								selectRandomTrack(top_tracks);
							}
						}
					} else {
						selectRandomTrack(top_tracks);
					}
					



					
				})
				.always(function() {
					_this.updateState('track-name-loading', false);
					if (_this.rtn_request == big_request){
						delete _this.rtn_request;
					}
					_this.checkChangesSinceFS();
				});
		}

		
	},
	prefindFiles: function(){
		this.findFiles({
			get_next: true
		});
	},
	bindSemEvents:function(sem) {
		this.sem = sem;
		var _this = this;
		sem.on('progress', function() {
			_this.filesSearchStarted();
		});
		sem.on('changed', function(complete){
			_this.updateFilesSearchState(complete);
		});
	},
	updateFilesSearchState: function(opts){

		var _this = this;
		/*
		var opts = {
			complete:,
			have_tracks: mp3,
			have_best_tracks: ''
		};
		*/

		//this.trigger('files_search', opts);
		this.updateState('files_search', opts);
		this.checkChangesSinceFS(opts);
	},
	bindFilesSearchChanges: function() {
		var investg = this.mf_cor.files_investg;
		var _this = this;
		investg
			.on('request', function(rq) {
				_this.addRequest(rq, {
					depend: true
				});
			})
			.on('state-change.search-complete', function(e) {
				_this.updateState('search-complete', e.value);
			})
			.on('state-change.has-request', function(e) {
				_this.updateState('searching-files', e.value);
			})
			.on('state-change.legacy-files-search', function(e) {
				_this.updateFilesSearchState(e.value);
			})
			.on('state-change.has-mp3-files', function(e) {
				_this.updateState('playable', e.value);
				if (e.value){
					_this.plst_titl.markAsPlayable();
				}
			});
	},
	isSearchAllowed: function() {
		return this.mf_cor && this.mf_cor.isSearchAllowed();
	},
	findFiles: function(opts){
		if (!this.artist || !this.track || !this.isSearchAllowed()){
			return false;
		}
		if (this.mp3_search){
			opts = opts || {};
			opts.only_cache = opts.only_cache && !this.state('want_to_play') && (!this.player.c_song || this.player.c_song.next_preload_song != this);
		
			
			var _this = this;
			var music_query = {
				artist:this.artist,
				track: this.track
			};

			this.mf_cor.files_investg.startSearch(opts);
		}
	},
	makeSongPlayalbe: function(full_allowing,  from_collection, last_in_collection){
		if (!this.track && full_allowing){
			if (this.getRandomTrackName){
				this.getRandomTrackName(full_allowing, from_collection, last_in_collection);
			}
			
		} else{
			this.findFiles({
				only_cache: !full_allowing,
				collect_for: from_collection,
				last_in_collection: last_in_collection
			});
		}
	},

	checkChangesSinceFS: function(opts){
		this.plst_titl.checkChangesSinceFS(this, opts);
	},
	view: function(no_navi, userwant){
		if (!this.state('mp-show')){
			this.trigger('view', no_navi, userwant);
		}
	},
	valueOf:function(){
		return (this.artist ? this.artist + ' - ' : '') + this.track;
	},
	isPossibleNeighbour: function(mo) {
		return this.isNeighbour(mo) || mo == this.next_preload_song;
	},
	isNeighbour: function(mo){
		return (mo == this.prev_song) || (mo == this.next_song);
	},
	canSearchFiles: function(){
		return !!(this.artist && this.track);
	},
	setPlayableInfo: function(info){
		this.playable_info = info;
		return this;
	},
	posistionChangeInMopla: function(mopla){
		if (this.getCurrentMopla() == mopla){
			this.submitPlayed(true);
			this.submitNowPlaying();

			if (!this.start_time){
				this.start_time = ((new Date() * 1)/1000).toFixed(0);
			}
		}
	},
	getCurrentMopla: function(){
		return this.mf_cor.getCurrentMopla();
	}
});


})();