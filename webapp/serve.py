import os, http.server, socketserver

port = int(os.environ.get("PORT", 7788))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", port), handler) as httpd:
    print(f"Serving on port {port}")
    httpd.serve_forever()
