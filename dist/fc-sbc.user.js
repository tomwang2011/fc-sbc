// ==UserScript==
// @name         FC SBC Enhanced Builder
// @namespace    fc-sbc-builder
// @version      1.0.11
// @author       tomwang
// @description  Optimal SBC builder with Storage-First priority
// @license      ISC
// @downloadURL  https://github.com/tomwang2011/fc-sbc/raw/main/dist/fc-sbc.user.js
// @updateURL    https://github.com/tomwang2011/fc-sbc/raw/main/dist/fc-sbc.user.js
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app/*
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const d$2=new Set;const importCSS = async e=>{d$2.has(e)||(d$2.add(e),(t=>{typeof GM_addStyle=="function"?GM_addStyle(t):(document.head||document.documentElement).appendChild(document.createElement("style")).append(t);})(e));};

  const scriptRel = (function detectScriptRel() {
    const relList = typeof document !== "undefined" && document.createElement("link").relList;
    return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
  })();
  const assetsURL = function(dep) {
    return "/" + dep;
  };
  const seen = {};
  const __vitePreload = function preload(baseModule, deps, importerUrl) {
    let promise = Promise.resolve();
    if (deps && deps.length > 0) {
      let allSettled = function(promises$2) {
        return Promise.all(promises$2.map((p2) => Promise.resolve(p2).then((value$1) => ({
          status: "fulfilled",
          value: value$1
        }), (reason) => ({
          status: "rejected",
          reason
        }))));
      };
      document.getElementsByTagName("link");
      const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
      const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
      promise = allSettled(deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) link.as = "script";
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) link.setAttribute("nonce", cspNonce);
        document.head.appendChild(link);
        if (isCss) return new Promise((res, rej) => {
          link.addEventListener("load", res);
          link.addEventListener("error", () => rej( new Error(`Unable to preload CSS for ${dep}`)));
        });
      }));
    }
    function handlePreloadError(err$2) {
      const e$12 = new Event("vite:preloadError", { cancelable: true });
      e$12.payload = err$2;
      window.dispatchEvent(e$12);
      if (!e$12.defaultPrevented) throw err$2;
    }
    return promise.then((res) => {
      for (const item of res || []) {
        if (item.status !== "rejected") continue;
        handlePreloadError(item.reason);
      }
      return baseModule().catch(handlePreloadError);
    });
  };
  var n, l$1, u$2, i$1, r$1, o$1, e$1, f$2, c$1, s$1, a$1, h$1, p$1, v$1, d$1 = {}, w$1 = [], _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, g = Array.isArray;
  function m$1(n2, l2) {
    for (var u2 in l2) n2[u2] = l2[u2];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k$1(l2, u2, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u2) "key" == o2 ? i2 = u2[o2] : "ref" == o2 ? r2 = u2[o2] : e2[o2] = u2[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u$2 : o2, __i: -1, __u: 0 };
    return null == o2 && null != l$1.vnode && l$1.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u2; l2 < n2.__k.length; l2++) if (null != (u2 = n2.__k[l2]) && null != u2.__e) return u2.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m$1({}, u2);
      o2.__v = u2.__v + 1, l$1.vnode && l$1.vnode(o2), q(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, null == t2 ? $(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D$1(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
      if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i$1.push(n2) && !H.__r++ || r$1 != l$1.debounceRendering) && ((r$1 = l$1.debounceRendering) || o$1)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1; i$1.length; ) i$1.length > l2 && i$1.sort(e$1), n2 = i$1.shift(), l2 = i$1.length, I(n2);
    } finally {
      i$1.length = H.__r = 0;
    }
  }
  function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y, _2, g2, m2 = t2 && t2.__k || w$1, b2 = l2.length;
    for (f2 = T(u2, l2, m2, f2, b2), a2 = 0; a2 < b2; a2++) null != (p2 = u2.__k[a2]) && (h2 = -1 != p2.__i && m2[p2.__i] || d$1, p2.__i = a2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f2, c2, s2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), s2.push(p2.ref, p2.__c || v2, p2)), null == y && null != v2 && (y = v2), (g2 = !!(4 & p2.__u)) || h2.__k === p2.__k ? (f2 = j$1(p2, f2, n2, g2), g2 && h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
    return u2.__e = y, f2;
  }
  function T(n2, l2, u2, t2, i2) {
    var r2, o2, e2, f2, c2, s2 = u2.length, a2 = s2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u2, f2, a2)) && (a2--, (e2 = u2[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > s2 ? h2-- : i2 < s2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (a2) for (r2 = 0; r2 < s2; r2++) null != (e2 = u2[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j$1(n2, l2, u2, t2) {
    var i2, r2;
    if ("function" == typeof n2.type) {
      for (i2 = n2.__k, r2 = 0; i2 && r2 < i2.length; r2++) i2[r2] && (i2[r2].__ = n2, l2 = j$1(i2[r2], l2, u2, t2));
      return l2;
    }
    n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function O(n2, l2, u2, t2) {
    var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], s2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == e2 || s2 && e2 == c2.key && f2 == c2.type) return u2;
    if (t2 > (s2 ? 1 : 0)) {
      for (i2 = u2 - 1, r2 = u2 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f2 == c2.type) return o2;
    }
    return -1;
  }
  function z$1(n2, l2, u2) {
    "-" == l2[0] ? n2.setProperty(l2, null == u2 ? "" : u2) : n2[l2] = null == u2 ? "" : "number" != typeof u2 || _.test(l2) ? u2 : u2 + "px";
  }
  function N(n2, l2, u2, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u2) n2.style.cssText = u2;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u2 && l2 in u2 || z$1(n2.style, l2, "");
      if (u2) for (l2 in u2) t2 && u2[l2] == t2[l2] || z$1(n2.style, l2, u2[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(a$1, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[s$1] = t2[s$1] : (u2[s$1] = h$1, n2.addEventListener(l2, r2 ? v$1 : p$1, r2)) : n2.removeEventListener(l2, r2 ? v$1 : p$1, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u2 ? "" : u2;
        break n;
      } catch (n3) {
      }
      "function" == typeof u2 || (null == u2 || false === u2 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u2 ? "" : u2));
    }
  }
  function V(n2) {
    return function(u2) {
      if (this.l) {
        var t2 = this.l[u2.type + n2];
        if (null == u2[c$1]) u2[c$1] = h$1++;
        else if (u2[c$1] < t2[s$1]) return;
        return t2(l$1.event ? l$1.event(u2) : u2);
      }
    };
  }
  function q(n2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y, d2, _2, k2, x2, M, $2, I2, P2, A2, H2, T2 = u2.type;
    if (void 0 !== u2.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (a2 = l$1.__b) && a2(u2);
    n: if ("function" == typeof T2) try {
      if (k2 = u2.props, x2 = T2.prototype && T2.prototype.render, M = (a2 = T2.contextType) && i2[a2.__c], $2 = a2 ? M ? M.props.value : a2.__ : i2, t2.__c ? _2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (x2 ? u2.__c = h2 = new T2(k2, $2) : (u2.__c = h2 = new C(k2, $2), h2.constructor = T2, h2.render = Q), M && M.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), x2 && null == h2.__s && (h2.__s = h2.state), x2 && null != T2.getDerivedStateFromProps && (h2.__s == h2.state && (h2.__s = m$1({}, h2.__s)), m$1(h2.__s, T2.getDerivedStateFromProps(k2, h2.__s))), v2 = h2.props, y = h2.state, h2.__v = u2, p2) x2 && null == T2.getDerivedStateFromProps && null != h2.componentWillMount && h2.componentWillMount(), x2 && null != h2.componentDidMount && h2.__h.push(h2.componentDidMount);
      else {
        if (x2 && null == T2.getDerivedStateFromProps && k2 !== v2 && null != h2.componentWillReceiveProps && h2.componentWillReceiveProps(k2, $2), u2.__v == t2.__v || !h2.__e && null != h2.shouldComponentUpdate && false === h2.shouldComponentUpdate(k2, h2.__s, $2)) {
          u2.__v != t2.__v && (h2.props = k2, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
            n3 && (n3.__ = u2);
          }), w$1.push.apply(h2.__h, h2._sb), h2._sb = [], h2.__h.length && e2.push(h2);
          break n;
        }
        null != h2.componentWillUpdate && h2.componentWillUpdate(k2, h2.__s, $2), x2 && null != h2.componentDidUpdate && h2.__h.push(function() {
          h2.componentDidUpdate(v2, y, d2);
        });
      }
      if (h2.context = $2, h2.props = k2, h2.__P = n2, h2.__e = false, I2 = l$1.__r, P2 = 0, x2) h2.state = h2.__s, h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), w$1.push.apply(h2.__h, h2._sb), h2._sb = [];
      else do {
        h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
      } while (h2.__d && ++P2 < 25);
      h2.state = h2.__s, null != h2.getChildContext && (i2 = m$1(m$1({}, i2), h2.getChildContext())), x2 && !p2 && null != h2.getSnapshotBeforeUpdate && (d2 = h2.getSnapshotBeforeUpdate(v2, y)), A2 = null != a2 && a2.type === S && null == a2.key ? E(a2.props.children) : a2, f2 = L(n2, g(A2) ? A2 : [A2], u2, t2, i2, r2, o2, e2, f2, c2, s2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), _2 && (h2.__E = h2.__ = null);
    } catch (n3) {
      if (u2.__v = null, c2 || null != o2) if (n3.then) {
        for (u2.__u |= c2 ? 160 : 128; f2 && 8 == f2.nodeType && f2.nextSibling; ) f2 = f2.nextSibling;
        o2[o2.indexOf(f2)] = null, u2.__e = f2;
      } else {
        for (H2 = o2.length; H2--; ) b(o2[H2]);
        B$1(u2);
      }
      else u2.__e = t2.__e, u2.__k = t2.__k, n3.then || B$1(u2);
      l$1.__e(n3, u2, t2);
    }
    else null == o2 && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G(t2.__e, u2, t2, i2, r2, o2, e2, c2, s2);
    return (a2 = l$1.diffed) && a2(u2), 128 & u2.__u ? void 0 : f2;
  }
  function B$1(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B$1));
  }
  function D$1(n2, u2, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
    l$1.__c && l$1.__c(u2, n2), n2.some(function(u3) {
      try {
        n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
          n3.call(u3);
        });
      } catch (n3) {
        l$1.__e(n3, u3.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : m$1({}, n2);
  }
  function G(u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y, w2, _2, m2 = i2.props || d$1, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (a2 = 0; a2 < e2.length; a2++) if ((y = e2[a2]) && "setAttribute" in y == !!x2 && (x2 ? y.localName == x2 : 3 == y.nodeType)) {
        u2 = y, e2[a2] = null;
        break;
      }
    }
    if (null == u2) {
      if (null == x2) return document.createTextNode(k2);
      u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l$1.__m && l$1.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
    else {
      if (e2 = e2 && n.call(u2.childNodes), !c2 && null != e2) for (m2 = {}, a2 = 0; a2 < u2.attributes.length; a2++) m2[(y = u2.attributes[a2]).name] = y.value;
      for (a2 in m2) y = m2[a2], "dangerouslySetInnerHTML" == a2 ? p2 = y : "children" == a2 || a2 in k2 || "value" == a2 && "defaultValue" in k2 || "checked" == a2 && "defaultChecked" in k2 || N(u2, a2, null, y, o2);
      for (a2 in k2) y = k2[a2], "children" == a2 ? v2 = y : "dangerouslySetInnerHTML" == a2 ? h2 = y : "value" == a2 ? w2 = y : "checked" == a2 ? _2 = y : c2 && "function" != typeof y || m2[a2] === y || N(u2, a2, y, m2[a2], o2);
      if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u2.innerHTML = ""), L("template" == t2.type ? u2.content : u2, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $(i2, 0), c2, s2), null != e2) for (a2 = e2.length; a2--; ) b(e2[a2]);
      c2 || (a2 = "value", "progress" == x2 && null == w2 ? u2.removeAttribute("value") : null != w2 && (w2 !== u2[a2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[a2]) && N(u2, a2, w2, m2[a2], o2), a2 = "checked", null != _2 && _2 != u2[a2] && N(u2, a2, _2, m2[a2], o2));
    }
    return u2;
  }
  function J(n2, u2, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u2 || (n2.__u = n2(u2));
      } else n2.current = u2;
    } catch (n3) {
      l$1.__e(n3, t2);
    }
  }
  function K(n2, u2, t2) {
    var i2, r2;
    if (l$1.unmount && l$1.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u2)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l$1.__e(n3, u2);
      }
      i2.base = i2.__P = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u2, t2 || "function" != typeof n2.type);
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l2, u2) {
    return this.constructor(n2, u2);
  }
  function R(u2, t2, i2) {
    var r2, o2, e2, f2;
    t2 == document && (t2 = document.documentElement), l$1.__ && l$1.__(u2, t2), o2 = (r2 = false) ? null : t2.__k, e2 = [], f2 = [], q(t2, u2 = t2.__k = k$1(S, null, [u2]), o2 || d$1, d$1, t2.namespaceURI, o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, o2 ? o2.__e : t2.firstChild, r2, f2), D$1(e2, u2, f2);
  }
  n = w$1.slice, l$1 = { __e: function(n2, l2, u2, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u$2 = 0, C.prototype.setState = function(n2, l2) {
    var u2;
    u2 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m$1({}, this.state), "function" == typeof n2 && (n2 = n2(m$1({}, u2), this.props)), n2 && m$1(u2, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i$1 = [], o$1 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e$1 = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f$2 = Math.random().toString(8), c$1 = "__d" + f$2, s$1 = "__a" + f$2, a$1 = /(PointerCapture)$|Capture$/i, h$1 = 0, p$1 = V(false), v$1 = V(true);
  var f$1 = 0;
  function u$1(e2, t2, n2, o2, i2, u2) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f$1, __i: -1, __u: 0, __source: i2, __self: u2 };
    if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
    return l$1.vnode && l$1.vnode(l2), l2;
  }
  var t, r, u, i, o = 0, f = [], c = l$1, e = c.__b, a = c.__r, v = c.diffed, l = c.__c, m = c.unmount, s = c.__;
  function p(n2, t2) {
    c.__h && c.__h(r, n2, o || t2), o = 0;
    var u2 = r.__H || (r.__H = { __: [], __h: [] });
    return n2 >= u2.__.length && u2.__.push({}), u2.__[n2];
  }
  function d(n2) {
    return o = 1, h(D, n2);
  }
  function h(n2, u2, i2) {
    var o2 = p(t++, 2);
    if (o2.t = n2, !o2.__c && (o2.__ = [D(void 0, u2), function(n3) {
      var t2 = o2.__N ? o2.__N[0] : o2.__[0], r2 = o2.t(t2, n3);
      t2 !== r2 && (o2.__N = [r2, o2.__[1]], o2.__c.setState({}));
    }], o2.__c = r, !r.__f)) {
      var f2 = function(n3, t2, r2) {
        if (!o2.__c.__H) return true;
        var u3 = o2.__c.__H.__.filter(function(n4) {
          return n4.__c;
        });
        if (u3.every(function(n4) {
          return !n4.__N;
        })) return !c2 || c2.call(this, n3, t2, r2);
        var i3 = o2.__c.props !== n3;
        return u3.some(function(n4) {
          if (n4.__N) {
            var t3 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t3 !== n4.__[0] && (i3 = true);
          }
        }), c2 && c2.call(this, n3, t2, r2) || i3;
      };
      r.__f = true;
      var c2 = r.shouldComponentUpdate, e2 = r.componentWillUpdate;
      r.componentWillUpdate = function(n3, t2, r2) {
        if (this.__e) {
          var u3 = c2;
          c2 = void 0, f2(n3, t2, r2), c2 = u3;
        }
        e2 && e2.call(this, n3, t2, r2);
      }, r.shouldComponentUpdate = f2;
    }
    return o2.__N || o2.__;
  }
  function j() {
    for (var n2; n2 = f.shift(); ) {
      var t2 = n2.__H;
      if (n2.__P && t2) try {
        t2.__h.some(z), t2.__h.some(B), t2.__h = [];
      } catch (r2) {
        t2.__h = [], c.__e(r2, n2.__v);
      }
    }
  }
  c.__b = function(n2) {
    r = null, e && e(n2);
  }, c.__ = function(n2, t2) {
    n2 && t2.__k && t2.__k.__m && (n2.__m = t2.__k.__m), s && s(n2, t2);
  }, c.__r = function(n2) {
    a && a(n2), t = 0;
    var i2 = (r = n2.__c).__H;
    i2 && (u === r ? (i2.__h = [], r.__h = [], i2.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i2.__h.some(z), i2.__h.some(B), i2.__h = [], t = 0)), u = r;
  }, c.diffed = function(n2) {
    v && v(n2);
    var t2 = n2.__c;
    t2 && t2.__H && (t2.__H.__h.length && (1 !== f.push(t2) && i === c.requestAnimationFrame || ((i = c.requestAnimationFrame) || w)(j)), t2.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u), n3.u = void 0;
    })), u = r = null;
  }, c.__c = function(n2, t2) {
    t2.some(function(n3) {
      try {
        n3.__h.some(z), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B(n4);
        });
      } catch (r2) {
        t2.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t2 = [], c.__e(r2, n3.__v);
      }
    }), l && l(n2, t2);
  }, c.unmount = function(n2) {
    m && m(n2);
    var t2, r2 = n2.__c;
    r2 && r2.__H && (r2.__H.__.some(function(n3) {
      try {
        z(n3);
      } catch (n4) {
        t2 = n4;
      }
    }), r2.__H = void 0, t2 && c.__e(t2, r2.__v));
  };
  var k = "function" == typeof requestAnimationFrame;
  function w(n2) {
    var t2, r2 = function() {
      clearTimeout(u2), k && cancelAnimationFrame(t2), setTimeout(n2);
    }, u2 = setTimeout(r2, 35);
    k && (t2 = requestAnimationFrame(r2));
  }
  function z(n2) {
    var t2 = r, u2 = n2.__c;
    "function" == typeof u2 && (n2.__c = void 0, u2()), r = t2;
  }
  function B(n2) {
    var t2 = r;
    n2.__c = n2.__(), r = t2;
  }
  function D(n2, t2) {
    return "function" == typeof t2 ? t2(n2) : t2;
  }
  class SbcBuilder {
    static _clubPlayersMemory = [];
    static getSbcContext() {
      const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      try {
        const root = win.getAppMain().getRootViewController();
        const findController = (node) => {
          if (!node) return null;
          if (node._squad && node._challenge) return node;
          const children = [...node.childViewControllers || [], ...node.presentedViewController ? [node.presentedViewController] : [], ...node.currentController ? [node.currentController] : [], ...node._viewControllers || []];
          for (const child of children) {
            if (findController(child)) return findController(child);
          }
          return null;
        };
        const find = (n2) => {
          if (!n2) return null;
          if (n2._squad && n2._challenge) return n2;
          const kids = [...n2.childViewControllers || [], ...n2.presentedViewController ? [n2.presentedViewController] : [], ...n2.currentController ? [n2.currentController] : [], ...n2._viewControllers || []];
          for (const k2 of kids) {
            const r2 = find(k2);
            if (r2) return r2;
          }
          return null;
        };
        const controller = find(root);
        return controller ? { challenge: controller._challenge, squad: controller._squad, controller } : null;
      } catch (e2) {
        return null;
      }
    }
    static getCleanValue(val) {
      if (Array.isArray(val)) return val.map((v2) => v2?.value !== void 0 ? v2.value : v2);
      return val?.value !== void 0 ? val.value : val;
    }
    static fetchItems(criteriaParams) {
      const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      return new Promise((r2) => {
        const criteria = new win.UTSearchCriteriaDTO();
        const finalParams = Object.assign({
          type: "player",
          count: 200,
          excludeLoans: true,
          isUntradeable: "true",
          searchAltPositions: true,
          sortBy: "ovr",
          sort: "asc"
        }, criteriaParams);
        Object.assign(criteria, finalParams);
        win.services.Club.search(criteria).observe({ name: "fetch" }, (obs, res) => {
          const raw = res.response?.items || res.items || res._collection || res;
          r2(Array.isArray(raw) ? raw : raw?._collection || Object.values(raw || {}));
        });
      });
    }
    static async primeInventory(targetLevels = []) {
      const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      const repo = win.repositories.Item;
      if (!repo) return { total: 0, storage: 0, unassigned: 0 };
      const storageCriteria = new win.UTSearchCriteriaDTO();
      storageCriteria.type = "player";
      const storageItems = await new Promise((r2) => {
        win.services.Item.searchStorageItems(storageCriteria).observe({ name: "storage" }, (obs, res) => {
          const raw = res.response?.items || res.items || res._collection || res;
          r2(Array.isArray(raw) ? raw : raw?._collection || Object.values(raw || {}));
        });
      });
      const clubFetches = [this.fetchItems({ count: 250 })];
      targetLevels.forEach((lvl) => clubFetches.push(this.fetchItems({ level: lvl, count: 250 })));
      const clubResults = await Promise.all(clubFetches);
      const allPlayers = new Map();
      let storageCount = 0;
      let unassignedCount = 0;
      const addEntities = (items, source) => {
        items.forEach((p2) => {
          if (p2 && p2.id && !allPlayers.has(p2.id)) {
            const isStandard = p2.rareflag === 0 || p2.rareflag === 1 || p2.rarityId === 3 || p2.rareflag === 3;
            const isEvo = !!p2.evolutionInfo || p2.rareflag === 116 || p2.upgrades !== null;
            if (!isStandard || isEvo) return;
            p2._sourceType = source;
            p2._sourcePriority = source === "storage" ? 0 : source === "unassigned" ? 1 : 2;
            p2._personaId = Number(p2.definitionId) % 16777216;
            if (source === "storage") storageCount++;
            if (source === "unassigned") unassignedCount++;
            allPlayers.set(p2.id, p2);
          }
        });
      };
      addEntities(storageItems, "storage");
      const unRaw = repo.unassigned?._collection || repo.unassigned || [];
      addEntities(Array.isArray(unRaw) ? unRaw : Object.values(unRaw), "unassigned");
      clubResults.forEach((list) => addEntities(list, "club"));
      this._clubPlayersMemory = Array.from(allPlayers.values());
      return { total: this._clubPlayersMemory.length, storage: storageCount, unassigned: unassignedCount };
    }
    static async saveSquad(challenge, squad, controller) {
      const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      challenge.squad = squad;
      return new Promise((resolve) => {
        win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
          squad.onDataUpdated.notify();
          if (squad.isValid) squad.isValid();
          if (controller._pushSquadToView) controller._pushSquadToView(squad);
          resolve(res.success);
        });
      });
    }
    static calculateRating(items) {
      const active = items.filter((p2) => p2 !== null);
      if (active.length < 11) return 0;
      const ratings = active.map((p2) => p2.rating);
      const sum = ratings.reduce((a2, b2) => a2 + b2, 0);
      const avg = sum / 11;
      let cf = 0;
      ratings.forEach((r2) => {
        if (r2 > avg) cf += r2 - avg;
      });
      return Math.floor((sum + cf) / 11 + 0.0401);
    }
    static normalizePos(id) {
      if (!id && id !== 0) return null;
      const rawId = typeof id === "object" ? id.id : id;
      const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
      return map[rawId] || rawId;
    }
static async solveEfficient(log, settings) {
      const ctx = this.getSbcContext();
      if (!ctx) return log("❌ SBC Screen Not Found");
      const { challenge, squad, controller } = ctx;
      log("Analyzing Requirements...");
      const rawReqs = challenge.eligibilityRequirements || [];
      let minRaresNeeded = 0;
      const buckets = [];
      let globalLevel = null;
      const levelsToDiscover = new Set();
      rawReqs.forEach((r2) => {
        const rules = [];
        const col = r2.kvPairs._collection || r2.kvPairs;
        for (let k2 in col) rules.push({ key: parseInt(k2), value: this.getCleanValue(col[k2]) });
        const isRare = rules.some((rl) => rl.key === 25 && rl.value.includes(4) || rl.key === 18 && rl.value.includes(1));
        if (isRare) minRaresNeeded = Math.max(minRaresNeeded, r2.count || 0);
        const bronze = rules.some((rl) => rl.key === 17 && rl.value.includes(1) || rl.key === 3 && rl.value.includes(1));
        const silver = rules.some((rl) => rl.key === 17 && rl.value.includes(2) || rl.key === 3 && rl.value.includes(2));
        const gold = rules.some((rl) => rl.key === 17 && rl.value.includes(3) || rl.key === 3 && rl.value.includes(3));
        const bInfo = bronze ? { level: "bronze", min: 0, max: 64 } : silver ? { level: "silver", min: 65, max: 74 } : gold ? { level: "gold", min: 75, max: 82 } : null;
        if (bInfo) {
          levelsToDiscover.add(bInfo.level);
          if (r2.count > 0) buckets.push({ ...bInfo, count: r2.count });
          else if (r2.count === -1) globalLevel = bInfo;
        }
      });
      if (buckets.length === 0 && !globalLevel) globalLevel = { level: "gold", min: 75, max: 82 };
      await this.primeInventory(Array.from(levelsToDiscover));
      const pool = this._clubPlayersMemory.filter((p2) => {
        if (settings.untradOnly && p2.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p2.leagueId)) return false;
        return true;
      }).sort((a2, b2) => a2._sourcePriority - b2._sourcePriority || a2.rating - b2.rating);
      const usedPersonaIds = new Set();
      const usedIds = new Set();
      const activeSlots = squad.getSBCSlots().filter((s2) => !s2.isBrick() && s2.index <= 10);
      const selected = new Array(activeSlots.length).fill(null);
      let raresInserted = 0;
      const findMatch = (lvl, rareflag, ignoreRarity = false) => {
        return pool.find((p2) => {
          if (usedIds.has(p2.id) || usedPersonaIds.has(p2._personaId)) return false;
          if (p2.rating < lvl.min || p2.rating > (lvl.level === "gold" ? 82 : lvl.max)) return false;
          if (!ignoreRarity && p2.rareflag !== rareflag) return false;
          return true;
        });
      };
      [...buckets, ...globalLevel ? [{ ...globalLevel, count: 11 }] : []].forEach((bucket) => {
        let count = 0;
        activeSlots.forEach((slot, i2) => {
          if (selected[i2] || count >= (bucket.count === 11 || bucket.count === -1 ? activeSlots.length : bucket.count)) return;
          let match = raresInserted < minRaresNeeded ? findMatch(bucket, 1) : findMatch(bucket, 0, bucket.level !== "gold");
          if (!match) match = findMatch(bucket, 0, true);
          if (match) {
            selected[i2] = match;
            usedIds.add(match.id);
            usedPersonaIds.add(match._personaId);
            count++;
            if (match.rareflag) raresInserted++;
          }
        });
      });
      const finalArray = new Array(23).fill(null);
      activeSlots.forEach((slot, i2) => {
        if (selected[i2]) finalArray[slot.index] = selected[i2];
      });
      squad.setPlayers(finalArray);
      await this.saveSquad(challenge, squad, controller);
      log("✅ Solve Successful.");
    }
static async solveDeClogger(log, settings) {
      const ctx = this.getSbcContext();
      if (!ctx) return log("❌ SBC Screen Not Found");
      const { challenge, squad, controller } = ctx;
      log("Checking Anchor...");
      let isTotwRequired = false;
      (challenge.eligibilityRequirements || []).forEach((r2) => {
        const rules = this.getCleanValue(r2.kvPairs._collection || r2.kvPairs);
        if (rules.some && rules.some((rl) => rl.key === 18 && rl.value.includes(3))) isTotwRequired = true;
      });
      await this.primeInventory(isTotwRequired ? ["special"] : ["gold"]);
      const pool = this._clubPlayersMemory.filter((p2) => {
        if (settings.untradOnly && p2.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p2.leagueId)) return false;
        if (p2.rating >= 89) return false;
        return true;
      }).sort((a2, b2) => a2._sourcePriority - b2._sourcePriority || a2.rating - b2.rating);
      const usedPersonaIds = new Set();
      const usedIds = new Set();
      const activeSlots = squad.getSBCSlots().filter((s2) => !s2.isBrick() && s2.index <= 10);
      const selected = new Array(activeSlots.length).fill(null);
      let anchor = isTotwRequired ? pool.find((p2) => p2.rarityId === 3 || p2.rareflag === 3) : pool.find((p2) => p2.rating >= 87 && p2.rating <= 88 && p2.rareflag === 1);
      if (anchor) {
        selected[0] = anchor;
        usedIds.add(anchor.id);
        usedPersonaIds.add(anchor._personaId);
      } else {
        return log("❌ No valid Anchor found.");
      }
      const clogs = { 83: 0, 84: 0 };
      pool.forEach((p2) => {
        if (p2._sourceType === "storage" && (p2.rating === 83 || p2.rating === 84)) clogs[p2.rating]++;
      });
      let pattern = anchor.rating >= 88 ? [{ r: 83, c: 10 }] : clogs[84] >= 6 ? [{ r: 84, c: 6 }, { r: 83, c: 4 }] : [{ r: 87, c: 1 }, { r: 83, c: 9 }];
      pattern.forEach((pReq) => {
        let count = 0;
        pool.filter((p2) => p2.rating === pReq.r && p2.rareflag <= 1).forEach((p2) => {
          const idx = selected.findIndex((s2) => s2 === null);
          if (count < pReq.c && idx !== -1 && !usedIds.has(p2.id) && !usedPersonaIds.has(p2._personaId)) {
            selected[idx] = p2;
            usedIds.add(p2.id);
            usedPersonaIds.add(p2._personaId);
            count++;
          }
        });
      });
      activeSlots.forEach((slot, i2) => {
        if (selected[i2]) return;
        const filler = pool.find((p2) => !usedIds.has(p2.id) && !usedPersonaIds.has(p2._personaId) && p2.rareflag <= 1);
        if (filler) {
          selected[i2] = filler;
          usedIds.add(filler.id);
          usedPersonaIds.add(filler._personaId);
        }
      });
      const finalArray = new Array(23).fill(null);
      activeSlots.forEach((slot, i2) => {
        if (selected[i2]) finalArray[slot.index] = selected[i2].item || selected[i2];
      });
      squad.setPlayers(finalArray);
      await this.saveSquad(challenge, squad, controller);
      log("✅ De-Clogger Complete.");
    }
static async solveLeague(log, settings) {
      const ctx = this.getSbcContext();
      if (!ctx) return log("❌ SBC Screen Not Found");
      const { challenge, squad, controller } = ctx;
      log("Analyzing Target Rating...");
      const rawReqs = challenge.eligibilityRequirements || [];
      let targetRating = 0;
      const detectedLeagues = new Set();
      rawReqs.forEach((r2) => {
        const col = r2.kvPairs._collection || r2.kvPairs;
        for (let k2 in col) {
          const val = this.getCleanValue(col[k2]);
          const key = parseInt(k2);
          if (key === 19) {
            const cleanVal = Array.isArray(val) ? val[0] : val;
            targetRating = Math.max(targetRating, Number(cleanVal) || 0);
          }
          if (key === 11) (Array.isArray(val) ? val : [val]).forEach((l2) => detectedLeagues.add(l2));
        }
      });
      log(`Goal: ${targetRating} Rating | Required Leagues: ${Array.from(detectedLeagues).join(",")}`);
      const discoveryLeagues = Array.from(detectedLeagues).slice(0, 3);
      await Promise.all(discoveryLeagues.map((l2) => this.fetchItems({ league: l2, count: 150 })));
      await this.primeInventory();
      const globalLeagues = Array.from(detectedLeagues);
      const pool = this._clubPlayersMemory.filter((p2) => {
        if (settings.untradOnly && p2.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p2.leagueId)) return false;
        if (p2.rating >= 83) return false;
        if (globalLeagues.length > 0 && !globalLeagues.includes(p2.leagueId)) return false;
        return true;
      }).sort((a2, b2) => a2._sourcePriority - b2._sourcePriority || a2.rating - b2.rating);
      const usedPersonaIds = new Set();
      const usedIds = new Set();
      const activeSlots = squad.getSBCSlots().filter((s2) => !s2.isBrick() && s2.index <= 10);
      const selected = new Array(activeSlots.length).fill(null);
      const fillPass = (source, matchPos) => {
        activeSlots.forEach((slot, i2) => {
          if (selected[i2]) return;
          const slotPos = SbcBuilder.normalizePos(slot.position?.id || slot._position);
          const match = pool.find((p2) => {
            if (usedIds.has(p2.id) || usedPersonaIds.has(p2._personaId)) return false;
            if (source && p2._sourceType !== source) return false;
            if (matchPos && SbcBuilder.normalizePos(p2.preferredPosition) !== slotPos) return false;
            return true;
          });
          if (match) {
            selected[i2] = match;
            usedIds.add(match.id);
            usedPersonaIds.add(match._personaId);
          }
        });
      };
      fillPass("storage", true);
      fillPass("storage", false);
      fillPass("club", true);
      fillPass("club", false);
      if (targetRating > 0) {
        log(`Optimizing Rating to hit ${targetRating}...`);
        let bridgeAttempts = 0;
        while (bridgeAttempts < 50 && this.calculateRating(selected) < targetRating) {
          bridgeAttempts++;
          const minR = Math.min(...selected.filter((s2) => s2).map((s2) => s2.rating));
          const upIdx = selected.findIndex((s2) => s2 && s2.rating === minR);
          if (upIdx === -1) break;
          const currentItem = selected[upIdx];
          const upgrade = pool.find((p2) => !usedIds.has(p2.id) && !usedPersonaIds.has(p2._personaId) && p2.rating > currentItem.rating && p2.leagueId === currentItem.leagueId);
          if (upgrade) {
            console.log(`[BRIDGE] Upgrading Slot ${upIdx}: ${currentItem.rating} -> ${upgrade.rating} (${upgrade._staticData?.name})`);
            usedIds.delete(currentItem.id);
            usedPersonaIds.delete(currentItem._personaId);
            selected[upIdx] = upgrade;
            usedIds.add(upgrade.id);
            usedPersonaIds.add(upgrade._personaId);
          } else break;
        }
      }
      const finalArray = new Array(23).fill(null);
      activeSlots.forEach((slot, i2) => {
        if (selected[i2]) finalArray[slot.index] = selected[i2].item || selected[i2];
      });
      squad.setPlayers(finalArray);
      await this.saveSquad(challenge, squad, controller);
      log(`✅ League Solve Complete. Rating: ${this.calculateRating(selected)}`);
    }
  }
  function App() {
    const [isOpen, setIsOpen] = d(false);
    const [isScanning, setIsScanning] = d(false);
    const [isSolving, setIsSolving] = d(false);
    const [status, setStatus] = d("Ready.");
    const [stats, setStats] = d({ total: 0, sbcStorage: 0, unassigned: 0 });
    const [untradOnly, setUntradOnly] = d(true);
    const [excludedLeagues, setExcludedLeagues] = d([]);
    const leagues = [
      { id: 13, name: "PL" },
      { id: 53, name: "ESP1" },
      { id: 19, name: "GER1" },
      { id: 31, name: "ITA1" },
      { id: 16, name: "FRA1" },
      { id: 10, name: "NED1" },
      { id: 308, name: "POR1" },
      { id: 4, name: "BEL1" }
    ];
    const toggleLeague = (id) => {
      setExcludedLeagues((prev) => prev.includes(id) ? prev.filter((l2) => l2 !== id) : [...prev, id]);
    };
    const handleScan = async () => {
      setIsScanning(true);
      setStatus("Syncing...");
      try {
        await new Promise((r2) => setTimeout(r2, 100));
        const res = await SbcBuilder.primeInventory();
        setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
        setStatus("Sync Complete.");
      } catch (e2) {
        setStatus("❌ Sync Failed.");
      } finally {
        setIsScanning(false);
      }
    };
    const runSolver = async (type) => {
      setIsSolving(true);
      setStatus(`Solving ${type}...`);
      try {
        const solverMap = {
          league: SbcBuilder.solveLeague.bind(SbcBuilder),
          declog: SbcBuilder.solveDeClogger.bind(SbcBuilder),
          efficient: SbcBuilder.solveEfficient.bind(SbcBuilder)
        };
        await solverMap[type]((msg) => setStatus(msg), { untradOnly, excludedLeagues });
        const res = await SbcBuilder.primeInventory();
        setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
      } catch (e2) {
        setStatus(`❌ Error: ${e2.message}`);
      } finally {
        setIsSolving(false);
      }
    };
    return u$1(
      "div",
      {
        style: {
          position: "fixed",
          top: "50%",
          left: "8px",
          transform: "translateY(-50%)",
          pointerEvents: "auto",
          zIndex: 2147483647
        },
        className: "font-sans select-none",
        children: [
u$1(
            "button",
            {
              onClick: () => {
                setIsOpen(!isOpen);
                if (!isOpen && stats.total === 0) handleScan();
              },
              style: {
                backgroundColor: isOpen ? "#ef4444" : "#4f46e5",
                width: "48px",
                height: "48px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                color: "white",
                border: "2px solid rgba(255,255,255,0.4)",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: "1 !important"
              },
              children: u$1("span", { style: { fontSize: "24px", fontWeight: "900" }, children: isOpen ? "✕" : "⚡" })
            }
          ),
          isOpen && u$1(
            "div",
            {
              style: {
                backgroundColor: "#09090b",
                opacity: "1 !important",
                border: "1px solid #3f3f46",
                width: "calc(100vw - 24px)",
                maxWidth: "320px",
                position: "absolute",
                top: "50%",
                left: "60px",
                transform: "translateY(-50%)",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 40px 100px rgba(0,0,0,1)",
                display: "block"
              },
              className: "animate-in slide-in-from-left-4 fade-in duration-300",
              children: [
u$1("div", { className: "flex justify-between items-center mb-6", children: [
u$1("h2", { className: "text-xs font-black text-white tracking-widest uppercase opacity-60", children: "SBC Master V1.0.11" }),
u$1(
                    "button",
                    {
                      onClick: handleScan,
                      disabled: isScanning,
                      style: { background: "#18181b", borderRadius: "8px", border: "1px solid #27272a" },
                      className: `p-2 ${isScanning ? "animate-spin opacity-50" : ""} text-zinc-400`,
                      children: "🔄"
                    }
                  )
                ] }),
u$1("div", { className: "space-y-5", children: [
u$1("div", { className: "grid grid-cols-3 gap-2.5", children: [
u$1("div", { style: { background: "#18181b" }, className: "p-3 rounded-2xl text-center border border-zinc-800 shadow-sm", children: [
u$1("div", { className: "text-[8px] text-zinc-500 font-bold uppercase mb-1", children: "Club" }),
u$1("div", { className: "font-black text-white text-base", children: stats.total })
                    ] }),
u$1("div", { style: { background: "#172554" }, className: "p-3 rounded-2xl text-center border border-blue-900 shadow-sm", children: [
u$1("div", { className: "text-[8px] text-blue-400 font-bold uppercase mb-1", children: "Storage" }),
u$1("div", { className: "font-black text-blue-300 text-base", children: stats.sbcStorage })
                    ] }),
u$1("div", { style: { background: "#431407" }, className: "p-3 rounded-2xl text-center border border-orange-950 shadow-sm", children: [
u$1("div", { className: "text-[8px] text-orange-400 font-bold uppercase mb-1", children: "Unasgn" }),
u$1("div", { className: "font-black text-orange-300 text-base", children: stats.unassigned })
                    ] })
                  ] }),
u$1("div", { style: { background: "#18181b" }, className: "p-4 rounded-2xl border border-zinc-800 shadow-inner", children: [
u$1("h3", { className: "text-[9px] font-black text-zinc-500 uppercase mb-3 tracking-widest text-center", children: "Ignore Leagues" }),
u$1("div", { className: "grid grid-cols-4 gap-2", children: leagues.map((l2) => u$1(
                      "button",
                      {
                        onClick: () => toggleLeague(l2.id),
                        style: {
                          background: excludedLeagues.includes(l2.id) ? "#dc2626" : "#27272a",
                          minHeight: "32px"
                        },
                        className: `text-[8px] font-black rounded-lg transition-all ${excludedLeagues.includes(l2.id) ? "text-white border-red-800" : "text-zinc-500 border-zinc-800"} border shadow-sm`,
                        children: l2.name
                      }
                    )) })
                  ] }),
u$1("div", { style: { background: "#18181b" }, className: "p-4 rounded-2xl border border-zinc-800", children: u$1("label", { className: "flex items-center justify-between cursor-pointer", children: [
u$1("span", { className: "text-[9px] font-black text-zinc-400 uppercase tracking-widest", children: "Untradeable Only" }),
u$1("div", { className: "relative", children: [
u$1("input", { type: "checkbox", className: "sr-only", checked: untradOnly, onChange: (e2) => setUntradOnly(e2.currentTarget.checked) }),
u$1("div", { className: `w-11 h-6 rounded-full transition-colors ${untradOnly ? "bg-indigo-600" : "bg-zinc-700"}` }),
u$1("div", { className: `absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${untradOnly ? "translate-x-5" : ""}` })
                    ] })
                  ] }) }),
u$1("div", { className: "space-y-3 pt-2", children: [
u$1(
                      "button",
                      {
                        disabled: isSolving,
                        onClick: () => runSolver("league"),
                        style: { background: "#4f46e5", borderBottom: "4px solid #3730a3", minHeight: "48px" },
                        className: "w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest",
                        children: "⚽ League Solver"
                      }
                    ),
u$1(
                      "button",
                      {
                        disabled: isSolving,
                        onClick: () => runSolver("declog"),
                        style: { background: "#d97706", borderBottom: "4px solid #92400e", minHeight: "48px" },
                        className: "w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest",
                        children: "📦 De-Clogger"
                      }
                    ),
u$1(
                      "button",
                      {
                        disabled: isSolving,
                        onClick: () => runSolver("efficient"),
                        style: { background: "#059669", borderBottom: "4px solid #065f46", minHeight: "48px" },
                        className: "w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest",
                        children: "💎 Efficient"
                      }
                    )
                  ] }),
u$1("div", { style: { background: "#000" }, className: "rounded-2xl p-4 min-h-[56px] flex items-center justify-center border border-zinc-800 shadow-inner", children: u$1("p", { className: "text-[10px] text-zinc-400 font-bold text-center leading-tight uppercase tracking-widest", children: status }) })
                ] })
              ]
            }
          )
        ]
      }
    );
  }
  const styleCss = "@tailwind base;@tailwind components;@tailwind utilities;";
  const style = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: styleCss
  }, Symbol.toStringTag, { value: "Module" }));
  importCSS(styleCss);
  console.log("%c--- [FC-SBC] SCRIPT INJECTED & RUNNING ---", "background: #000; color: #fff; font-size: 20px;");
  const init = () => {
    if (document.getElementById("fc-sbc-builder-root")) return;
    const root = document.body;
    if (!root) return;
    console.log(`[FC-SBC] Mounting UI into ${root.tagName}...`);
    const container = document.createElement("div");
    container.id = "fc-sbc-builder-root";
    container.style.cssText = "position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; pointer-events:none;";
    root.appendChild(container);
    const shadowRoot = container.attachShadow({ mode: "open" });
    const mountPoint = document.createElement("div");
    mountPoint.style.pointerEvents = "auto";
    shadowRoot.appendChild(mountPoint);
    const style$1 = document.createElement("style");
    __vitePreload(() => Promise.resolve().then(() => style), void 0 ).then((css) => {
      style$1.textContent = css.default;
      shadowRoot.appendChild(style$1);
    });
    R( u$1(App, {}), mountPoint);
  };
  const checkUI = setInterval(() => {
    if (document.body) {
      clearInterval(checkUI);
      init();
    }
  }, 1e3);
  setInterval(() => {
    if (!document.getElementById("fc-sbc-builder-root")) init();
  }, 5e3);

})();