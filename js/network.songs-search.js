var isohuntTorrentSearch = function(opts) {
	//this.crossdomain = cross_domain_allowed;
	this.mp3_search = opts.mp3_search;
	this.cache_ajax = opts.cache_ajax;
	//var _this = this;
};
isohuntTorrentSearch.prototype = {
	constructor: isohuntTorrentSearch,
	cache_namespace: 'isohunt',
	name: "torrents",
	s: {
		name:"Isohunt torrents",
		key:0,
		type: "torrent"
	},
	send: function(query, options) {
		var _this = this;

		if (query) {
			options = options || {};
			options.cache_key = options.cache_key || hex_md5('zzzzzzz' + query);

			var wrap_def = app_serv.wrapRequest({
				url: "http://ca.isohunt.com/js/json.php",
				type: "GET",
				dataType: "json",
				data: {
					ihq: query
				},
				timeout: 20000
			}, {
				cache_ajax: this.cache_ajax,
				nocache: options.nocache,
				cache_key: options.cache_key,
				cache_timeout: options.cache_timeout,
				cache_namespace: this.cache_namespace,
				queue: this.queue
			});

			return wrap_def.complex;
		}
	},
	findAudio: function(msq, opts) {
		var
			_this = this,
			query = msq.q ? msq.q: ((msq.artist || '') + (msq.track ?  (' - ' + msq.track) : ''));

		opts = opts || {};
		opts.cache_key = opts.cache_key || query;

		var async_ans = this.send(query, opts);

		var
			result,
			olddone = async_ans.done;

		async_ans.done = function(cb) {
			olddone.call(this, function(r) {
				if (!result){
					result = [];
					if (r.items && r.items.list){
						for (var i = 0; i < Math.min(r.items.list.length, 10); i++) {
							_this.wrapItem(result, r.items.list[i], msq);
						}
					}
					
				}
				cb(result, 'torrent');

			});
			return this;
		};
		return async_ans;
	},
	url_regexp: /torrent\_details\/(\d*)\//,
	wrapItem: function(r, sitem, query) {
		r.push({
			isohunt_id: sitem.guid,
			HTMLTitle: sitem.title,
			media_type: 'torrent',
			torrent_link: 'http://isohunt.com/download/' + sitem.guid,
			query: query,
			models: {},
			getSongFileModel: function(mo, player) {
				return this.models[mo.uid] = this.models[mo.uid] || (new FileInTorrent(this, mo)).setPlayer(player);
			}
		});
	}
};





var googleTorrentSearch = function(opts) {
	this.crossdomain = opts.crossdomain;
	this.mp3_search = opts.mp3_search;
	this.cache_ajax = opts.cache_ajax;
	var _this = this;
};
googleTorrentSearch.prototype = {
	constructor: googleTorrentSearch,
	cache_namespace: 'google_isohunt',
	name: "torrents",
	s: {
		name:"Google/Isohunt torrents",
		key:0,
		type: "torrent"
	},
	send: function(query, options) {
		var _this = this;
			
		if (query) {
			options = options || {};
			options.cache_key = options.cache_key || hex_md5('zzzzzzz' + query);


			var wrap_def = app_serv.wrapRequest({
				url: "https://ajax.googleapis.com/ajax/services/search/web",
				type: "GET",
				dataType: this.crossdomain ? "json": "jsonp",
				data: {
					cx: "001069742470440223270:ftotl-vgnbs",
					v: "1.0",
					q: query //"allintext:" + song + '.mp3'
				},
				timeout: 20000
				
			}, {
				cache_ajax: this.cache_ajax,
				nocache: options.nocache,
				cache_key: options.cache_key,
				cache_timeout: options.cache_timeout,
				cache_namespace: this.cache_namespace,
				requestFn: function() {
					return aReq.apply(this, arguments);
				},
				queue: this.queue
			});

			return wrap_def.complex;
		}
	},
	findAudio: function(msq, opts) {
		var
			_this = this,
			query = msq.q ? msq.q: ((msq.artist || '') + (msq.track ?  (' - ' + msq.track) : ''));

		opts = opts || {};
		opts.cache_key = opts.cache_key || query;

		var async_ans = this.send("allintext:" + "(" + query  + '.mp3' + ")", opts);

		var
			result,
			olddone = async_ans.done;

		async_ans.done = function(cb) {
			olddone.call(this, function(r) {
				if (!result){
					result = [];
					for (var i = 0; i < r.responseData.results.length; i++) {
						_this.wrapItem(result, r.responseData.results[i], msq);
					}
				}
				cb(result, 'torrent');

			});
			return this;
		};
		return async_ans;
	},
	url_regexp: /torrent\_details\/(\d*)\//,
	wrapItem: function(r, item, query) {
		var isohunt_id = item && item.url && item.url.match(this.url_regexp);
		if (isohunt_id && isohunt_id[1]){
			r.push(item);
			item.isohunt_id = isohunt_id[1];
			item.torrent_link = 'http://isohunt.com/download/' + item.isohunt_id;
			item.query = query;
			item.media_type = 'torrent';
			item.title = item.titleNoFormatting = HTMLDecode(item.titleNoFormatting);
			item.models = {};
			item.getSongFileModel = function(mo, player) {
				return this.models[mo.uid] = this.models[mo.uid] || (new FileInTorrent(this, mo)).setPlayer(player);
			};
		}
		
	}
};
