from flask import Flask, render_template, request, jsonify
import requests

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