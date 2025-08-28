from flask import Flask, render_template, request, jsonify
import requests
import argparse

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/send", methods=['POST'])
def api_send():
    data = request.get_json()
    url = data.get('url')
    method = data.get('method', 'GET').upper()
    body = data.get('body', '')
    headers = data.get('headers', {})

    try:
        if method in ['POST', 'PUT', 'PATCH']:
            resp = requests.request(
                method=method,
                url=url,
                headers=headers,
                data=body.encode('utf-8') if body else None,
                timeout=10
            )
        else:
            resp = requests.request(
                method=method,
                url=url,
                headers=headers,
                timeout=10
            )

        try:
            resp_body = resp.text
        except Exception:
            resp_body = repr(resp.content)

        return jsonify({
            "status": resp.status_code,
            "statusText": resp.reason,
            "headers": dict(resp.headers),
            "body": resp_body
        })
    except Exception as e:
        return jsonify({
            "status": 0,
            "statusText": "Error",
            "headers": {},
            "body": str(e)
        }), 500

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Header Hunter Web Tool")
    parser.add_argument("--port", type=int, default=5000, help="Port to run the server on (default: 5000)")
    args = parser.parse_args()
    app.run(host="0.0.0.0", port=args.port)