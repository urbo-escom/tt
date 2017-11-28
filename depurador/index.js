window.addEventListener('load', function() {
	var loader = function(url) {
		var source = document.getElementById('source');
		var file = document.getElementById('file');
		return function(e) {
			e.preventDefault();
			e.stopPropagation();
			var req = new XMLHttpRequest();
			req.addEventListener('load', function() {
				source.value = this.responseText;
				file.innerHTML = url;
				if ('createEvent' in document) {
					var evt = document.createEvent('HTMLEvents');
					evt.initEvent('input', false, true);
					source.dispatchEvent(evt);
				} else {
					source.fireEvent('oninput');
				}
			});
			req.open('GET', url);
			req.send();
		};
	};

	var projects = document.getElementsByClassName('editor-listing');
	for (var i = 0; i < projects.length; i++) {
		var name = projects[i].dataset.project;
		var req = new XMLHttpRequest();
		req.addEventListener('load', (function(list) {
			return function() {
				var data = JSON.parse(this.responseText);
				for (var j = 0; j < data.files.length; j++) {
					var li = document.createElement('li');
						li.dataset.file = data.files[j];
					var a = document.createElement('a');
						a.href = data.files[j];
						a.className = 'file-load';
						a.innerHTML = data.files[j];
						a.addEventListener('click', loader(data.files[j]));
					li.appendChild(a);
					list.appendChild(li);
				}
			};
		})(projects[i]));
		req.open('GET', name);
		req.send();
	}
});


var post_form = function(url, params, cb) {
	var req = new XMLHttpRequest();
	req.addEventListener('load', function() {
		cb(JSON.parse(this.responseText));
	});
	var body_pairs = [];
	for (var k in params)
		body_pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
	var body_str = body_pairs.join('&').replace(/%20/g, '+');
	req.open('POST', url);
	req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	req.send(body_str);
};

var get = function(url, cb) {
	var req = new XMLHttpRequest();
	req.addEventListener('load', function() {
		cb(JSON.parse(this.responseText));
	});
	req.open('GET', url);
	req.send();
};

var debug_info = {
	lineno: 0,
	logs: [],
};

var gdb_buttons = function() {
	document.getElementById('gdb-brk').get_brk_num = function() {
		return parseInt(document.getElementById('gdb-brk-num').value);
	};
	return {
		run:      document.getElementById('compile-debug'),
		stop:     document.getElementById('gdb-stop'),
		step:     document.getElementById('gdb-step'),
		next:     document.getElementById('gdb-next'),
		finish:   document.getElementById('gdb-finish'),
		continue: document.getElementById('gdb-continue'),
		brk:      document.getElementById('gdb-brk'),
	};
};

var poll_loaded = false;
var poll_status = function() {
	var log = document.getElementById('log');
	var stdout = document.getElementById('stdout');
	var source = document.getElementById('source');
	var source_line = document.getElementById('gdb-line');
	var source_file = document.getElementById('gdb-file');
	var source_preview = document.getElementById('source-preview');
	get('/depurador/log/?lineno=' + debug_info.lineno, function(data) {
		setTimeout(poll_status, 500);
		var bs = gdb_buttons();

		if ('debugging' !== data.state) {
			log.innerHTML = '';
			for (var b in bs)
				bs[b].disabled = true;
			bs.run.disabled = false;
			source.style.display = 'block';
			source_preview.style.display = 'none';
			return;
		}
		log.innerHTML = '';
		for (var b in bs)
			bs[b].disabled = false;
		bs.run.disabled = true;
		debug_info.logs = data.logs;
		var src;
		var last_stop;
		source_preview.parentNode.dataset.line = -1;
		source_line.value = -1;
		source_file.value = '<UNKNOWN>';
		data.logs.forEach(function(e) {
			log.innerHTML += e;
			if (!/\*stopped/.test(e))
				return;
			last_stop = e;
		});
		if (last_stop) {
			var str = last_stop;
			var mm = /file="([^"]+)"/.exec(str);
			if (mm && 1 < mm.length) {
				src = mm[1];
			}
			var nn = /line="([^"]+)"/.exec(str);
			if (mm && nn && 1 < nn.length) {
				source_preview.parentNode.dataset.line = parseInt(nn[1]);
				source_line.value = parseInt(nn[1]);
			}
			var oo = /func="([^"]+)"/.exec(str);
			if (oo && mm && nn && 1 < oo.length) {
				source_file.value = oo[1];
			}
		}
		source.style.display = 'none';
		source_preview.style.display = 'block';
		if (!poll_loaded) {
			var req = new XMLHttpRequest();
			req.addEventListener('load', function() {
				source.value = this.responseText;
				source_preview.innerHTML = source.value;
				Prism.highlightElement(source_preview);
				poll_loaded = true;
			});
			req.open('GET', '/file-a.c');
			req.send();
		} else {
			source_preview.innerHTML = source.value;
			Prism.highlightElement(source_preview);
		}
	});
};
setTimeout(poll_status, 500);

var gdb_cmd = function(cmd, cb) {
	post_form('/depurador/comando/', {
		command: cmd,
	}, cb || (function() {
		console.log('GDB', cmd);
	}));
};
var gdb_stop     = function(cb) { gdb_cmd('-gdb-exit', cb); };
var gdb_step     = function(cb) { gdb_cmd('-exec-step', cb); };
var gdb_next     = function(cb) { gdb_cmd('-exec-next', cb); };
var gdb_finish   = function(cb) { gdb_cmd('-exec-finish', cb); };
var gdb_continue = function(cb) { gdb_cmd('-exec-continue', cb); };
var gdb_brk = function(line, cb) {
	gdb_cmd('-break-insert ' + parseInt(line), cb);
};

window.addEventListener('load', function() {
	var bs = gdb_buttons();
	bs.stop.addEventListener('click',     function() { gdb_stop(); });
	bs.step.addEventListener('click',     function() { gdb_step(); });
	bs.next.addEventListener('click',     function() { gdb_next(); });
	bs.finish.addEventListener('click',   function() { gdb_finish(); });
	bs.continue.addEventListener('click', function() { gdb_continue(); });
	bs.brk.addEventListener('click', function() {
		gdb_brk(this.get_brk_num());
	});
});

window.addEventListener('load', function() {
	var debug = document.getElementById('compile-debug');
	var source = document.getElementById('source');
	var source_preview = document.getElementById('source-preview');
	var log = document.getElementById('log');
	var stdin = document.getElementById('stdin');
	var stdout = document.getElementById('stdout');
	var stderr = document.getElementById('stderr');
	debug.addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		post_form('/depurador/depurar/', {
			source: source.value,
			stdin: stdin.value,
		}, function(data) {
			stderr.innerHTML = data.log;
			if ('debugging' !== data.state) {
				source_preview.style.display = 'none';
				return;
			}
			source_preview.style.display = 'block';
			source_preview.innerHTML = source.value;
			Prism.highlightElement(source_preview);
		});
	});
});
