""" THIS IS AN AUTOMATICALLY GENERATED FILE!"""
from __future__ import print_function
import json
from engine import primitives
from engine.core import requests
from engine.errors import ResponseParsingException
from engine import dependencies
req_collection = requests.RequestCollection([])
# Endpoint: /auth/login, method: Post
request = requests.Request([
    primitives.restler_static_string("POST "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("auth"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("login"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_static_string("Content-Type: "),
    primitives.restler_static_string("application/json"),
    primitives.restler_static_string("\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),
    primitives.restler_static_string("{"),
    primitives.restler_static_string("""
    "email":"""),
    primitives.restler_fuzzable_string("fuzzstring", quoted=True),
    primitives.restler_static_string(""",
    "password":"""),
    primitives.restler_fuzzable_string("fuzzstring", quoted=True),
    primitives.restler_static_string("}"),
    primitives.restler_static_string("\r\n"),

],
requestId="/auth/login"
)
req_collection.add_request(request)

# Endpoint: /admin/analytics, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("analytics"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/analytics"
)
req_collection.add_request(request)

# Endpoint: /admin/restaurants, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("restaurants"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/restaurants"
)
req_collection.add_request(request)

# Endpoint: /admin/restaurants/{id}/approve, method: Post
request = requests.Request([
    primitives.restler_static_string("POST "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("restaurants"),
    primitives.restler_static_string("/"),
    primitives.restler_fuzzable_int("1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("approve"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/restaurants/{id}/approve"
)
req_collection.add_request(request)

# Endpoint: /admin/drivers, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("drivers"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/drivers"
)
req_collection.add_request(request)

# Endpoint: /admin/drivers/{id}/approve, method: Post
request = requests.Request([
    primitives.restler_static_string("POST "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("drivers"),
    primitives.restler_static_string("/"),
    primitives.restler_fuzzable_int("1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("approve"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/drivers/{id}/approve"
)
req_collection.add_request(request)

# Endpoint: /admin/invoices, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("invoices"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/invoices"
)
req_collection.add_request(request)

# Endpoint: /admin/invoices/{id}, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("invoices"),
    primitives.restler_static_string("/"),
    primitives.restler_fuzzable_int("1"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/invoices/{id}"
)
req_collection.add_request(request)

# Endpoint: /admin/invoices/generate, method: Post
request = requests.Request([
    primitives.restler_static_string("POST "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("invoices"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("generate"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/invoices/generate"
)
req_collection.add_request(request)

# Endpoint: /admin/users, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("users"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/users"
)
req_collection.add_request(request)

# Endpoint: /admin/orders, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("admin"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("orders"),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/admin/orders"
)
req_collection.add_request(request)

# Endpoint: /orders, method: Get
request = requests.Request([
    primitives.restler_static_string("GET "),
    primitives.restler_basepath("/api/v1"),
    primitives.restler_static_string("/"),
    primitives.restler_static_string("orders"),
    primitives.restler_static_string("?"),
    primitives.restler_static_string("restaurant_id="),
    primitives.restler_fuzzable_string("fuzzstring", quoted=False),
    primitives.restler_static_string(" HTTP/1.1\r\n"),
    primitives.restler_static_string("Accept: application/json\r\n"),
    primitives.restler_static_string("Host: host.docker.internal:45000\r\n"),
    primitives.restler_refreshable_authentication_token("authentication_token_tag"),
    primitives.restler_static_string("\r\n"),

],
requestId="/orders"
)
req_collection.add_request(request)
