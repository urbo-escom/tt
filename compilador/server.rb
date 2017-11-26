#!/usr/bin/env ruby
require 'webrick'
require 'json'
require 'open3'
include WEBrick

config = {}
config.update(:Port => 8080)
config.update(:BindAddress => 'localhost')
config.update(:DocumentRoot => '.')
server = HTTPServer.new(config)
['INT', 'TERM'].each {|signal|
	trap(signal) {server.shutdown}
}

class Compiler < WEBrick::HTTPServlet::AbstractServlet
	def do_GET(req, res)
		res['Content-Type'] = 'text/plain'
		res.body = 'Hello World'
		raise HTTPStatus::OK
	end
	def do_POST(req, res)
		res['Content-Type'] = 'text/plain; charset=utf-8'
		ide = {
			:exe    => './file-compiled.exe'
		}

		data = {
			:source => req.query['source'],
			:stdin => (req.query['stdin'] || ''),
			:stdout => '',
			:stderr => '',
			:state => '',
			:status => 0
		}

		data[:state] = 'compiling'
		Open3.popen3("gcc -o " + ide[:exe] + " -xc -") do |stdin, stdout, stderr, main|
			stdin.puts (req.query['source'] || '')
			stdin.close
			{:stdout => stdout, :stderr => stderr}.each do |k, stream|
				Thread.new do
					until (line = stream.gets).nil? do
						data[k] += line
					end
				end
			end
			main.join
			data[:status] = main.value.exitstatus
		end
		if 0 != data[:status]
			File.delete(ide[:exe]) if File.exist?(ide[:exe])
			res.body = JSON.pretty_generate(data)
			raise HTTPStatus::OK
		end

		data[:state] = 'running'
		Open3.popen3(ide[:exe]) do |stdin, stdout, stderr, main|
			stdin.puts (req.query['stdin'] || '')
			stdin.close
			{:stdout => stdout, :stderr => stderr}.each do |k, stream|
				Thread.new do
					until (line = stream.gets).nil? do
						data[k] += line
					end
				end
			end
			main.join
			data[:status] = main.value.exitstatus
		end

		data[:state] = 'done'
		File.delete(ide[:exe]) if File.exist?(ide[:exe])
		res.body = JSON.pretty_generate(data)
		raise HTTPStatus::OK
	end
end

class Index < WEBrick::HTTPServlet::AbstractServlet
	def do_GET(req, res)
		if '/' == req.path
			filename = './index.html'
		else
			filename = '.' + req.path
		end

		if '/example-project/' == req.path
			files = {:files => []}
			res['Content-Type'] =  'application/json; charset=utf-8'
			Dir.glob('./example-project/**/*').select{|e| File.file? e}.each do |file|
				files[:files].push(file)
			end
			res.body = JSON.pretty_generate(files)
			raise HTTPStatus::OK
		end

		if File.exist?(filename)
			case File.extname(filename)
			when ".html"
				res['Content-Type'] = 'text/html; charset=utf-8'
			when ".c"
				res['Content-Type'] = 'text/plain; charset=utf-8'
			when ".js"
				res['Content-Type'] = 'application/javascript; charset=utf-8'
			when ".css"
				res['Content-Type'] = 'text/css; charset=utf-8'
			end
			res.body = File.read(filename)
			raise HTTPStatus::OK
		else
			res['Content-Type'] =  'text/plain; charset=utf-8'
			res.body = 'File not found'
			raise HTTPStatus::NotFound
		end
	end
end

server.mount "/", Index
server.mount "/compilador/", Compiler
server.start
