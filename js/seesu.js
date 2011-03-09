$.ajaxSetup({
  cache: true,
  global:false
});
$.support.cors = true;

var get_url_parameters = function(){
	var url_vars = location.search.replace(/^\?/,'').split('&');
	var full_url = {};
	for (var i=0; i < url_vars.length; i++) {
		var _h = url_vars[i].split('=');
		full_url[_h[0]] = _h[1];
	};
	return full_url;
};


window.lfm_image_artist = 'http://cdn.last.fm/flatness/catalogue/noimage/2/default_artist_large.png';
window.lfm = function(){
	var _this = this;
	var ag = arguments;
	seesu.lfm_api.use.apply(seesu.lfm_api, ag);
}
window.seesu = window.su =  {
	  _url: get_url_parameters(),
	  distant_glow: {
	  	interact: null,
		url: 'http://seesu.me/',
		auth: JSON.parse(w_storage('dg_auth') || false)//{id, sid, secret}
	  },
	  api: function(method, params, callback, error){
	  	var _this = this;
	  	if (_this.distant_glow.interact && !!~_this.distant_glow.interact.indexOf(method)){
	  	
	  		params.method = method;
	  	
	  		if (!!~['user.update', 'track.scrobble'].indexOf(method)){
	  			if (!this.distant_glow.auth){
	  				return false
	  			} else{
	  				params.sid = this.distant_glow.auth.sid;
	  				params.sig = hex_md5(stringifyParams(params, ['sid']) + this.distant_glow.auth.secret) ;
	  			}
	  			
	  		}
	  		
			$.ajax({
				type: "GET",
				url: _this.distant_glow.url + 'api/',
				data: params,
				success: callback,
				error: error
			});
	  	}
	  },
	  fs: {},//fast search
	  lfm_api: new lastfm_api('2803b2bcbc53f132b4d4117ec1509d65', '77fd498ed8592022e61863244b53077d', true, app_env.cross_domain_allowed),
	  version: 1.998,
	  env: app_env,
	  track_stat: (function(){
		var _i = document.createElement('iframe');_i.id ='gstat';_i.src = 'http://seesu.me/g_stat.html';

		
		$(function(){
			document.body.appendChild(_i);
		});
		var ga_ready = false;
		var ga_ready_waiter = function(e){
			if ( e.origin == "http://seesu.me") { //security, sir!
				if (e.data == 'ga_stat_ready'){
					ga_ready = true;
					removeEvent(window, "message", ga_ready_waiter);
					seesu.track_stat('_setCustomVar', 1, 'environmental', (!app_env.unknown_app ? app_env.app_type : 'unknown_app'), 1);
					seesu.track_stat('_setCustomVar', 2, 'version', seesu.version, 1);
				}
			} else {
				return false;
			}
		};
		addEvent(window, "message", ga_ready_waiter);

		return function(){
			if (ga_ready){
				var string = 'track_stat';
				for (var i=0; i < arguments.length; i++) {
					string += '\n' + arguments[i];
				}
			
				_i.contentWindow.postMessage(string, "http://seesu.me");
			}
			
		};
	  })(),
	  track_event:function(){
		var args = Array.prototype.slice.call(arguments);
		args.unshift('_trackEvent');
		seesu.track_stat.apply(this, args);
	  },
	  track_page:function(){
		var args = Array.prototype.slice.call(arguments);
		args.unshift('_trackPageview');
		seesu.track_stat.apply(this, args);
	  },
	   track_var: function(){
		var args = Array.prototype.slice.call(arguments);
		args.unshift('_setCustomVar');
		seesu.track_stat.apply(this, args);
	  },
	  popular_artists: ["The Beatles", "Radiohead", "Muse", "Lady Gaga", "Eminem", "Coldplay", "Red Hot Chili Peppers", "Arcade Fire", "Metallica", "Katy Perry", "Linkin Park" ],
	  vk:{
		id: w_storage('vkid'),
		big_vk_cookie: w_storage('big_vk_cookie'),
		set_xhr_headers: function(xhr){
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			if (seesu.env.apple_db_widget && seesu.vk.big_vk_cookie){
				try {
					xhr.setRequestHeader("Cookie", seesu.vk.big_vk_cookie);
				} catch(e){}
			}
		}
	  },
	  ui: new seesu_ui(document),
	  xhrs: {},
	  soundcloud_queue: new funcs_queue(1000, 5000 , 7),
	  hypnotoad: {
		vk_api: false,
		search_soundcloud: soundcloud_search,
		search_tracks:function(){
			if(seesu.hypnotoad.vk_api){
				seesu.track_event('mp3 search', 'hypnotoad');
				return seesu.hypnotoad.vk_api.audio_search.apply(seesu.hypnotoad.vk_api, arguments);
			}
			
		}
	  },
	  delayed_search: {
	  	tracks_waiting_for_search:0,
		use:{
			queue:  new funcs_queue(1000, 8000 , 7)
		},
		vk:{
			queue:  new funcs_queue(1000, 8000 , 7)
		},
		vk_api:{
			queue:  new funcs_queue(1000, 8000 , 7)
		}


	  }
	};

var detach_vkapi = function(timeout){
	return setTimeout(function(){
		
	}, timeout);
};
var auth_to_vkapi = function(vk_s, save_to_store, app_id, fallback, error_callback, callback){
	var rightnow = ((new Date()).getTime()/1000).toFixed(0);
	if (!vk_s.expire || (vk_s.expire > rightnow)){
		console.log('want vk api')
		var user_api_data = {
			api_id: app_id, 
			s: vk_s.secret,
			viewer_id: vk_s.mid, 
			sid: vk_s.sid, 
			use_cache: true,
			v: "3.0"
		};
		var _vkapi = new vk_api([user_api_data], seesu.delayed_search.vk_api.queue, false, 
		function(info, r){
			if (info){
				
				seesu.vk.id = vk_s.mid;
				seesu.vk_api = _vkapi;
				
				su.mp3_search.add(_vkapi.asearch, true);
				
				console.log('got vk api');
				
				
				
				if (save_to_store){
					w_storage('vk_session'+app_id, vk_s, true);
				}
				
				if (vk_s.expire){
					var end = (vk_s.expire - rightnow)*1000;
					if (fallback){
						var _t = detach_vkapi(end + 10000);
						setTimeout(function(){
							fallback(function(){
								clearTimeout(_t);
							});
						}, end);
					} else{
						detach_vkapi(end);
					}
				}
				
				
				var _d = {data_source: 'vkontakte'};
				for (var a in info) {
					_d[a] = info[a];
				};
				su.vk.user_info = _d;
				
				
				
				if (!su.distant_glow.auth || su.distant_glow.auth.id != user_api_data.viewer_id){
					su.api('user.getAuth', {
						type:'vk',
						vk_api: JSON.stringify({
							session: user_api_data,
							timeout: vk_s.expire
						}),
					}, function(su_sess){
						if (su_sess.rkey && su_sess.sid){
							
							_vkapi.use('getVariable', {key: su_sess.rkey}, function(resp){
								var secret = resp && resp.response;
								if (secret){
									su.distant_glow.auth = {
										id: user_api_data.viewer_id,
										secret: secret,
										sid: su_sess.sid
									};
									w_storage('dg_auth', su.distant_glow.auth, true);
									su.api('user.update', su.vk.user_info);
								}
								
								
							}, false,  {nocache: true});
							
						}
						
					});
				} else{
					su.api('user.update', su.vk.user_info);
				}
				
				
				
				
				
				if (callback){callback();}
			} else{
				
				w_storage('vk_session'+app_id, '', true);
				error_callback('no info');
			}
			
		},function(){
			detach_vkapi();
	
			fallback(false, true);
		});
		
		
		
		
	} else{
		w_storage('vk_session'+app_id, '', true);
		error_callback('expired');
	}
}

window.set_vk_auth = function(vk_session, save_to_store){
	var vk_s = JSON.parse(vk_session);
	auth_to_vkapi(vk_s, save_to_store, 1915003, try_api);

};
function stringifyParams(params, ignore_params, splitter){
	var paramsstr = '',
		pv_signature_list = [];
	
	
	for (var p in params) {
		if (!ignore_params || !~ignore_params.indexOf(p)){
			pv_signature_list.push(p + (splitter || '') + params[p]);
		}
	}
		
	pv_signature_list.sort();
		
	for (var i=0, l = pv_signature_list.length; i < l; i++) {
		paramsstr += pv_signature_list[i];
	};
		
	return paramsstr;
	
};
if (su._url.q){
	su.start_query = su._url.q;
}



var vkReferer = '';

var updating_notify = function(r){
	if (!r){return;}
	
	if(r.distant_glow_interact){
		su.distant_glow.interact = r.distant_glow_interact;
		if (su.vk.user_info){
			su.api('user.update', su.vk.user_info);
		}	
	}
	
	var cver = r.latest_version.number;
	if (cver > seesu.version) {
		var message = 
		 'Suddenly, Seesu ' + cver + ' has come. ' + 
		 'You have version ' + seesu.version + '. ';
		var link = r.latest_version.link;
		if (link.indexOf('http') != -1) {
			widget.showNotification(message, function(){
				open_url(link);
			});
			$('#promo').append('<a id="update-star" href="' + link + '" title="' + message + '"><img src="/i/update_star.png" alt="update start"/></a>');
		}
	}
	if (r.vk_apis){
		seesu.hypnotoad.api = new vk_api(r.vk_apis, new queue(1300,5000,7));
	}
	console.log('lv: ' +  cver + ' reg link: ' + (vkReferer = r.vk_referer));

};
var check_seesu_updates = function(){
	
		$.ajax({
		  url: su.distant_glow.url + 'update',
		  global: false,
		  type: "POST",
		  dataType: "json",
		  data: {
			'hash': hex_md5(widget.identifier),
			'version': seesu.version,
			'demension_x': w_storage('width'),
			'demension_y': w_storage('height')
		  },
		  error: function(){
		  },
		  success: updating_notify
		});
	
	
};

var external_playlist = function(array){ //array = [{artist_name: '', track_title: '', duration: '', mp3link: ''}]
	this.result = this.header + '\n';
	for (var i=0; i < array.length; i++) {
		this.result += this.preline + ':' + (array[i].duration || '-1') + ',' + array[i].artist_name + ' - ' + array[i].track_title + '\n' + array[i].mp3link + '\n';
	}
	this.data_uri = this.request_header + escape(this.result);
	
};
external_playlist.prototype = {
	header : '#EXTM3U',
	preline: '#EXTINF',
	request_header : 'data:audio/x-mpegurl; filename=seesu_playlist.m3u; charset=utf-8,'
};

var make_external_playlist = function(){
	if (!seesu.player.c_song ){return false;}
	var simple_playlist = [];
	for (var i=0; i < seesu.player.c_song.plst_titl.length; i++) {
		var song = seesu.player.c_song.plst_titl[i].song();
		if (song){
			simple_playlist.push({
				track_title: song.track,
				artist_name: song.artist,
				duration: song.duration,
				mp3link: song.link
			});
		}
			
		
	};
	
	if (simple_playlist.length){
		seesu.player.current_external_playlist = new external_playlist(simple_playlist);
		seesu.ui.els.export_playlist.attr('href', seesu.player.current_external_playlist.data_uri);
		
	}
};



var get_next_track_with_priority = function(mo){
	var _din = mo.delayed_in;
	for (var i=0; i < _din.length; i++) {
		_din[i].pr = seesu.player.want_to_play || 1;
	}
	su.mp3_search.find_mp3(mo, {
		get_next: true
	});
}



var random_track_plable = function(track_list){
	var random_track_num = Math.floor(Math.random()*track_list.length);
	return track_list[random_track_num];
	
};
var start_random_nice_track_search = function(mo, ob, not_search_mp3){
	mo.node.addClass('loading');
	getTopTracks(mo.artist, function(track_list){
		var some_track = random_track_plable(track_list);
		mo.node.removeClass('loading');
		mo.node.text(some_track.artist + ' - ' + (mo.track = some_track.track));
		su.mp3_search.find_mp3(mo, {
			only_cache: not_search_mp3 && !mo.want_to_play && (!su.player.c_song || su.player.c_song.next_preload_song != mo)
		});
		
		
		++ob.num;
	}, function(){
		mo.node.removeClass('loading');
	});
};

var make_tracklist_playable = function(pl, full_allowing){
	
	if (full_allowing){
		su.mp3_search.abortAllSearches();
		//mp3_prov_queue = reset_q();
	}
	
	

	var ob = {num:0};
	for (var i=0, l =  pl.length; i < l; i++) {
		var mo = pl[i];
		if (!mo.track){
			start_random_nice_track_search(mo, ob, !full_allowing );
		} else{
			if (mo.raw){
				su.ui.updateSong(mo);
			} else{
				su.mp3_search.find_mp3(mo, {
					only_cache: !full_allowing && !mo.want_to_play
				});
			}
			
		}
	}
};



function viewSong(mo){
	su.player.view_song(mo, true, false);
}


var wantSong = function(mo){
	if (mo.want_to_play == seesu.player.want_to_play && su.player.wainter_for_play == mo) {
		su.player.play_song(mo, true);
	} 
};

var empty_song_click = function(){
	var clicked_node = $(this);
	
	if (seesu.player.wainter_for_play && seesu.player.wainter_for_play.node) {
		seesu.player.wainter_for_play.node.removeClass('marked-for-play');
	}
	var new_pr = ++seesu.player.want_to_play;
	
	var mo = clicked_node.addClass('marked-for-play').data('mo');
	
	mo.want_to_play = new_pr;
	var delayed_in = mo.delayed_in;
	for (var i=0; i < delayed_in.length; i++) {
		delayed_in[i].pr = new_pr;
	}
	
	seesu.player.wainter_for_play = mo;
	seesu.ui.views.save_view(mo.plst_titl);
	
	su.mp3_search.find_mp3(mo);
	su.ui.updateSongContext(mo);
	viewSong(mo);
	seesu.track_event('Song click', 'empty song');
	return false;	
};

var prepare_playlist = function(playlist_title, playlist_type, with_search_results_link){
	var pl = [];
	pl.loading = true;
	if (playlist_title){
		pl.playlist_title = playlist_title;
	}
	if (playlist_type){
		pl.playlist_type = playlist_type;
	}
	if (with_search_results_link){
		pl.with_search_results_link = with_search_results_link;
	}
	pl.kill = function(){
		for (var i = this.length - 1; i >= 0; i--){
			this.pop().kill();
		};
	};
	var oldpush = pl.push;
	pl.push = function(mo){
		extendSong(mo)
		return oldpush.apply(this, arguments);
	}
	return pl;
};
var create_playlist =  function(pl, pl_r, not_clear){
	if (!pl){
		seesu.ui.render_playlist(pl_r);
	} else{
		
		for (var i=0, l = pl.length; i < l; i++) {
			pl_r.push(seesu.gena.connect(pl[i], pl_r, i));
		}
		seesu.ui.render_playlist(pl_r, not_clear);
		
	}
	
};



var getTopTracks = function(artist,callback, error_c) {
	lfm('artist.getTopTracks',{'artist': artist },function(r){
		if (typeof r != 'object') {return;}
		var tracks = r.toptracks.track || false;
		if (tracks) {
			var track_list = [];
			if (tracks.length){
				for (var i=0, l = (tracks.length < 30) ? tracks.length : 30; i < l; i++) {
					track_list.push({'artist' : artist ,'track': tracks[i].name});
				}
			} else{
				track_list.push({'artist' : artist ,'track': tracks.name});
			}
			
			if (callback) {callback(track_list);}
		}
	}, error_c);
};

var proxy_render_artists_tracks = function(artist_list, pl_r){
	if (artist_list || pl_r){
		var track_list_without_tracks = [];
		for (var i=0; i < artist_list.length; i++) {
			track_list_without_tracks.push({"artist" :artist_list[i]});
		}
		create_playlist(track_list_without_tracks, pl_r || []);
	} else{
		create_playlist();
	}
	
};
var render_loved = function(user_name){
	var pl_r = prepare_playlist(localize('loved-tracks'), 'artists by loved');
	lfm('user.getLovedTracks',{user: (user_name || su.lfm_api.user_name), limit: 30},function(r){
		
		var tracks = r.lovedtracks.track || false;
		if (tracks) {
			var track_list = [];
			for (var i=0, l = (tracks.length < 30) ? tracks.length : 30; i < l; i++) {
				track_list.push({'artist' : tracks[i].artist.name ,'track': tracks[i].name});
			}
			create_playlist(track_list,pl_r);
		}
	});
	seesu.ui.views.show_playlist_page(pl_r);
};
var render_recommendations_by_username = function(username){
	var pl_r = prepare_playlist('Recommendations for ' +  username, 'artists by recommendations')
	$.ajax({
		url: 'http://ws.audioscrobbler.com/1.0/user/' + username + '/systemrecs.rss',
		  global: false,
		  type: "GET",
		  dataType: "xml",
		  error: function(xml){
		  },
		  success: function(xml){
			var artists = $(xml).find('channel item title');
			if (artists && artists.length) {
				var artist_list = [];
				for (var i=0, l = (artists.length < 30) ? artists.length : 30; i < l; i++) {
					var artist = $(artists[i]).text();
					artist_list.push(artist);
				}
				proxy_render_artists_tracks(artist_list, pl_r);
			}
		  }
	});

	seesu.ui.views.show_playlist_page(pl_r);
};
var render_recommendations = function(){
	var pl_r = prepare_playlist('Recommendations for you', 'artists by recommendations');
	lfm('user.getRecommendedArtists',{sk: su.lfm_api.sk},function(r){
		var artists = r.recommendations.artist;
		if (artists && artists.length) {
			var artist_list = [];
			for (var i=0, l = (artists.length < 30) ? artists.length : 30; i < l; i++) {
				artist_list.push(artists[i].name);
			}
			proxy_render_artists_tracks(artist_list,pl_r);
		}
	}, function(){
		proxy_render_artists_tracks();
	},false, true);

	seesu.ui.views.show_playlist_page(pl_r);

};


var get_artists_by_tag = function(tag,callback,error_c){
	lfm('tag.getTopArtists',{'tag':tag},function(r){
		var artists = r.topartists.artist;
		if (artists && artists.length) {
			var artist_list = [];
			for (var i=0, l = (artists.length < 30) ? artists.length : 30; i < l; i++) {
				artist_list.push(artists[i].name);
			}
			if (callback) {callback(artist_list);}
		}
	}, error_c, false, true);
	return true;
};
var show_tag = function(tag, with_search_results){
	var pl_r = prepare_playlist('Tag: ' + tag, 'artists by tag', with_search_results);
	get_artists_by_tag(tag, function(pl){
		proxy_render_artists_tracks(pl, pl_r);
	}, function(){
		proxy_render_artists_tracks();
	});
	seesu.ui.views.show_playlist_page(pl_r);

};


var get_similar_artists = function(original_artist, callback,error_c){
	lfm('artist.getSimilar',{'artist': original_artist},function(r){
		var artists = r.similarartists.artist;
		if (artists && artists.length) {
			var artist_list = [];
			for (var i=0, l = (artists.length < 30) ? artists.length : 30; i < l; i++) {
				artist_list.push(artists[i].name);
			}
			if (callback) {callback(artist_list);}
		}
	}, error_c);
	return true;
};

var render_tracks_by_similar_artists = function(original_artist){
	var pl_r = prepare_playlist('Similar to «' + original_artist + '» artists', 'similar artists');
	seesu.ui.views.show_playlist_page(pl_r);
	get_similar_artists(original_artist, function(pl){
		proxy_render_artists_tracks(pl, pl_r)
	}, function(){
		proxy_render_artists_tracks();
	});
	
};






var make_lastfm_playlist = function(r, pl_r){
	var playlist = r.playlist.trackList.track;
	if  (playlist){
		var music_list = [];
		if (playlist.length){
			
			for (var i=0; i < playlist.length; i++) {
				music_list.push({track: playlist[i].title, artist: playlist[i].creator });
			}
		} else if (playlist.title){
			music_list.push({track: playlist.title, artist: playlist.creator });
		}
		if (music_list){
			create_playlist(music_list, pl_r);
		} else {
			create_playlist();
		}
	} else{
		create_playlist();
	}
};
var get_artist_album_playlist = function(r, pl_r){
	var album_id = r.album.id;
	if (album_id) {
		lfm('playlist.fetch',{'playlistURL': 'lastfm://playlist/album/' + album_id}, function(pl_data){
			make_lastfm_playlist(pl_data, pl_r);
		});
	}
};

var get_artist_album_info = function(artist, album, callback){
	
	lfm('album.getInfo',{'artist': artist, album : album},function(r){
		if (callback) {callback(r);}
	});
	
};


$(function(){
	check_seesu_updates();
	try_mp3_providers();
})
