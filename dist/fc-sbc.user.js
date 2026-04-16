// ==UserScript==
// @name         FC SBC Enhanced Builder
// @namespace    fc-sbc-builder
// @version      1.0.0
// @author       tomwang
// @description  Optimal SBC builder with Storage-First priority
// @license      ISC
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
          if (node.className && (node.className.includes("SBCSquad") || node.className.includes("SplitView"))) return node;
          const children = [
            ...node.childViewControllers || [],
            ...node.presentedViewController ? [node.presentedViewController] : [],
            ...node.currentController ? [node.currentController] : [],
            ...node._viewControllers || []
          ];
          for (const child of children) {
            const found = findController(child);
            if (found) return found;
          }
          return null;
        };
        const controller = findController(root);
        if (controller) {
          const squad = controller._squad || (controller._squadController ? controller._squadController._squad : null);
          let challenge = controller._challenge || (controller._overviewController ? controller._overviewController._challenge : null) || (controller._parentViewController ? controller._parentViewController._challenge : null);
          if (squad && challenge) return { challenge, squad, controller };
        }
      } catch (e2) {
      }
      return null;
    }
static async primeInventory() {
      const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      const repo = win.repositories.Item;
      if (!repo) return { total: 0, storage: 0, unassigned: 0 };
      console.log("[FC-SBC] Priming EA Repository...");
      const criteria = new win.UTSearchCriteriaDTO();
      criteria.type = "player";
      criteria.level = "gold";
      criteria.count = 250;
      await new Promise((r2) => {
        win.services.Club.search(criteria).observe(this, () => r2());
      });
      const allPlayers = new Map();
      let storageCount = 0;
      let unassignedCount = 0;
      const addEntities = (source, isSafe = false, isStorage = false, isUnassigned = false) => {
        if (!source) return;
        const raw = source._collection || source.items || (Array.isArray(source) ? source : []);
        const items = Array.isArray(raw) ? raw : Object.values(raw);
        items.forEach((p2) => {
          if (p2 && p2.id && (p2.type === "player" || typeof p2.isPlayer === "function" && p2.isPlayer())) {
            p2._isSafeSource = isSafe;
            if (isStorage) storageCount++;
            if (isUnassigned) unassignedCount++;
            allPlayers.set(p2.id, p2);
          }
        });
      };
      addEntities(repo.unassigned, true, false, true);
      addEntities(repo.getStorage()?.items, true, true, false);
      addEntities(repo.getClub()?.items, false, false, false);
      this._clubPlayersMemory = Array.from(allPlayers.values());
      console.log(`[FC-SBC] Sync Ready: ${this._clubPlayersMemory.length} players.`);
      return { total: this._clubPlayersMemory.length, storage: storageCount, unassigned: unassignedCount };
    }
    static calculateSquadRating(players) {
      const active = players.filter((p2) => p2 !== null);
      if (active.length === 0) return 0;
      const count = active.length;
      const ratings = active.map((p2) => p2.rating);
      const sum = ratings.reduce((a2, b2) => a2 + b2, 0);
      const avg = sum / count;
      let excess = 0;
      ratings.forEach((r2) => {
        if (r2 > avg) excess += r2 - avg;
      });
      const total = (sum + excess) / count;
      return Math.floor(total + 0.04);
    }
static async solveSbc() {
      const context = this.getSbcContext();
      if (!context) return alert("SBC Squad screen not detected.");
      const { challenge, squad, controller } = context;
      const pitchSlots = squad.getSBCSlots().filter((s2) => !s2.isBrick());
      try {
        await this.primeInventory();
        const pool = this._clubPlayersMemory.filter((p2) => {
          const isLoan = typeof p2.isLoanItem === "function" && p2.isLoanItem() || p2.loan && p2.loan > 0;
          const isEvo = typeof p2.isEvo === "function" && p2.isEvo() || !!p2.evolutionInfo || p2.rareflag === 116;
          const isGold = p2.rating >= 75;
          const isStandard = p2.subtype === 1;
          if (p2._isSafeSource && isGold) return true;
          return isGold && isStandard && !isLoan && !isEvo;
        }).sort((a2, b2) => a2.rating - b2.rating);
        console.log(`[FC-SBC] Solver Pool: ${pool.length} base golds.`);
        const requirements = (challenge.eligibilityRequirements || []).map((req) => {
          const col = req.kvPairs._collection || req.kvPairs;
          const rules = [];
          for (let key in col) {
            const val = col[key];
            const cleanValue = Array.isArray(val) ? val[0] : val && val.value !== void 0 ? val.value : val;
            rules.push({ key: parseInt(key), value: cleanValue });
          }
          return { rules, count: req.count };
        });
        const targetSquadRating = requirements.find((r2) => r2.count === -1 && r2.rules.some((rule) => rule.key === 19))?.rules.find((rule) => rule.key === 19)?.value || 0;
        const squadWideRules = requirements.filter((req) => req.count === -1).flatMap((req) => req.rules).filter((r2) => r2.key !== 19);
        const usedDefIds = new Set();
        const selected = new Array(pitchSlots.length).fill(null);
        const matchesRule = (player, rule) => {
          switch (rule.key) {
            case 3:
              return player.quality === rule.value;
            case 11:
              return player.leagueId === rule.value;
            case 12:
              return player.nationId === rule.value;
            case 13:
              return player.teamId === rule.value;
            case 25:
              return rule.value === 4 ? player.rareflag > 0 : player.rareflag === 0;
            case 18:
              return player.rarityId === 3 || player.rareflag === 3;
            case 19:
              return player.rating >= rule.value;
            default:
              return true;
          }
        };
        requirements.forEach((req) => {
          if (req.count <= 0) return;
          let satisfied = 0;
          for (let i2 = 0; i2 < pool.length && satisfied < req.count; i2++) {
            const p2 = pool[i2];
            if (!usedDefIds.has(p2.definitionId) && req.rules.every((r2) => matchesRule(p2, r2))) {
              const emptyIdx = selected.findIndex((s2) => s2 === null);
              if (emptyIdx !== -1) {
                selected[emptyIdx] = p2;
                usedDefIds.add(p2.definitionId);
                satisfied++;
              }
            }
          }
        });
        const smartStartRating = targetSquadRating >= 84 ? 83 : targetSquadRating >= 78 ? 75 : 45;
        for (let i2 = 0; i2 < selected.length; i2++) {
          if (selected[i2]) continue;
          let trash = pool.find((p2) => !usedDefIds.has(p2.definitionId) && p2.rating >= smartStartRating && squadWideRules.every((r2) => matchesRule(p2, r2))) || pool.find((p2) => !usedDefIds.has(p2.definitionId) && squadWideRules.every((r2) => matchesRule(p2, r2)));
          if (trash) {
            selected[i2] = trash;
            usedDefIds.add(trash.definitionId);
          }
        }
        if (targetSquadRating > 0 && selected.every((s2) => s2 !== null)) {
          let currentRating = this.calculateSquadRating(selected);
          let attempts = 0;
          while (currentRating < targetSquadRating && attempts < 500) {
            attempts++;
            const minIdx = selected.reduce((m2, p2, idx, arr) => p2.rating < arr[m2].rating ? idx : m2, 0);
            const old = selected[minIdx];
            const upgrade = pool.find((p2) => !usedDefIds.has(p2.definitionId) && p2.rating > old.rating && squadWideRules.every((r2) => matchesRule(p2, r2)));
            if (upgrade) {
              usedDefIds.delete(old.definitionId);
              selected[minIdx] = upgrade;
              usedDefIds.add(upgrade.definitionId);
              currentRating = this.calculateSquadRating(selected);
            } else break;
          }
        }
        const newPlayers = new Array(23).fill(null);
        selected.forEach((p2, i2) => {
          if (p2 && pitchSlots[i2]) newPlayers[pitchSlots[i2].index] = p2;
        });
        squad.setPlayers(newPlayers);
        squad.onDataUpdated.notify();
        const win = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        win.services.SBC.saveChallenge(challenge).observe(this, (obs, res) => {
          console.log(`[FC-SBC] Server Save: ${res.success ? "SUCCESS" : "FAILED"}`);
        });
        if (controller._overviewController?._pushSquadToView) {
          controller._overviewController._pushSquadToView(squad);
        } else if (controller._pushSquadToView) {
          controller._pushSquadToView(squad);
        }
        alert(`Successfully populated squad! Final Rating: ${this.calculateSquadRating(selected)}`);
      } catch (e2) {
        alert("Solver failed: " + e2.message);
        console.error(e2);
      }
    }
  }
  function App() {
    const [showBuilder, setShowBuilder] = d(false);
    const [isScanning, setIsScanning] = d(false);
    const [stats, setStats] = d({ total: 0, sbcStorage: 0, unassigned: 0 });
    const handleScan = async () => {
      setIsScanning(true);
      try {
        await new Promise((r2) => setTimeout(r2, 100));
        const res = await SbcBuilder.primeInventory();
        setStats({
          total: res.total,
          sbcStorage: res.storage,
          unassigned: res.unassigned
        });
      } catch (e2) {
        console.error("[FC-SBC] Scan error:", e2.message);
      } finally {
        setIsScanning(false);
      }
    };
    return u$1("div", { className: "fixed top-4 left-4 z-[9999999] pointer-events-auto font-sans text-zinc-900", children: [
u$1(
        "button",
        {
          onClick: () => {
            setShowBuilder(!showBuilder);
            if (!showBuilder && stats.total === 0) handleScan();
          },
          className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-xl transition-all hover:scale-105 flex items-center gap-2 border border-white/20",
          children: [
u$1("span", { className: "text-xl", children: "🚀" }),
u$1("span", { children: showBuilder ? "CLOSE" : "SBC BUILDER" })
          ]
        }
      ),
      showBuilder && u$1("div", { className: "absolute top-14 left-0 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-4", children: [
u$1("div", { className: "flex justify-between items-center mb-4", children: [
u$1("h2", { className: "text-lg font-bold text-zinc-900 dark:text-white", children: "SBC Optimizer" }),
u$1(
            "button",
            {
              onClick: handleScan,
              className: `text-xs ${isScanning ? "animate-spin" : ""} bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700`,
              children: "🔄"
            }
          )
        ] }),
u$1("div", { className: "space-y-3", children: [
u$1("div", { className: "grid grid-cols-3 gap-2", children: [
u$1("div", { className: "p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-center", children: [
u$1("div", { className: "text-[10px] text-zinc-400 uppercase", children: "Club" }),
u$1("div", { className: "font-bold text-zinc-900 dark:text-white", children: stats.total })
            ] }),
u$1("div", { className: "p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border border-blue-100 dark:border-blue-900/30", children: [
u$1("div", { className: "text-[10px] text-blue-500 uppercase", children: "Storage" }),
u$1("div", { className: "font-bold text-blue-600 dark:text-blue-400", children: stats.sbcStorage })
            ] }),
u$1("div", { className: "p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center border border-orange-100 dark:border-orange-900/30", children: [
u$1("div", { className: "text-[10px] text-orange-500 uppercase", children: "Unassgn" }),
u$1("div", { className: "font-bold text-orange-600 dark:text-orange-400", children: stats.unassigned })
            ] })
          ] }),
u$1("div", { className: "border-t border-zinc-100 dark:border-zinc-800 pt-3", children: [
u$1("div", { className: "flex justify-between text-xs mb-2", children: [
u$1("span", { className: "text-zinc-500", children: "Target Rating:" }),
u$1("span", { className: "font-mono bg-zinc-100 dark:bg-zinc-800 px-2 rounded", children: "84.x" })
            ] }),
u$1(
              "button",
              {
                className: "w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mb-2",
                onClick: () => SbcBuilder.solveSbc(),
                children: "🚀 GENERATE SQUAD"
              }
            )
          ] }),
u$1("p", { className: "text-[10px] text-zinc-400 text-center italic", children: "Prioritizing SBC Storage and Duplicates..." })
        ] })
      ] })
    ] });
  }
  const styleCss = '*,:before,:after{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }*,:before,:after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}:before,:after{--tw-content: ""}html,:host{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji",Segoe UI Symbol,"Noto Color Emoji";font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=button]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]:where(:not([hidden=until-found])){display:none}.container{width:100%}@media(min-width:640px){.container{max-width:640px}}@media(min-width:768px){.container{max-width:768px}}@media(min-width:1024px){.container{max-width:1024px}}@media(min-width:1280px){.container{max-width:1280px}}@media(min-width:1536px){.container{max-width:1536px}}.pointer-events-auto{pointer-events:auto}.static{position:static}.fixed{position:fixed}.absolute{position:absolute}.left-0{left:0}.left-4{left:1rem}.top-14{top:3.5rem}.top-4{top:1rem}.z-\\[9999999\\]{z-index:9999999}.mb-2{margin-bottom:.5rem}.mb-4{margin-bottom:1rem}.inline{display:inline}.flex{display:flex}.grid{display:grid}.w-80{width:20rem}.w-full{width:100%}@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-2{gap:.5rem}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse: 0;margin-top:calc(.75rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.75rem * var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.rounded{border-radius:.25rem}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.border{border-width:1px}.border-t{border-top-width:1px}.border-blue-100{--tw-border-opacity: 1;border-color:rgb(219 234 254 / var(--tw-border-opacity, 1))}.border-orange-100{--tw-border-opacity: 1;border-color:rgb(255 237 213 / var(--tw-border-opacity, 1))}.border-white\\/20{border-color:#fff3}.border-zinc-100{--tw-border-opacity: 1;border-color:rgb(244 244 245 / var(--tw-border-opacity, 1))}.border-zinc-200{--tw-border-opacity: 1;border-color:rgb(228 228 231 / var(--tw-border-opacity, 1))}.bg-blue-50{--tw-bg-opacity: 1;background-color:rgb(239 246 255 / var(--tw-bg-opacity, 1))}.bg-indigo-500{--tw-bg-opacity: 1;background-color:rgb(99 102 241 / var(--tw-bg-opacity, 1))}.bg-indigo-600{--tw-bg-opacity: 1;background-color:rgb(79 70 229 / var(--tw-bg-opacity, 1))}.bg-orange-50{--tw-bg-opacity: 1;background-color:rgb(255 247 237 / var(--tw-bg-opacity, 1))}.bg-white{--tw-bg-opacity: 1;background-color:rgb(255 255 255 / var(--tw-bg-opacity, 1))}.bg-zinc-100{--tw-bg-opacity: 1;background-color:rgb(244 244 245 / var(--tw-bg-opacity, 1))}.bg-zinc-50{--tw-bg-opacity: 1;background-color:rgb(250 250 250 / var(--tw-bg-opacity, 1))}.p-1\\.5{padding:.375rem}.p-2{padding:.5rem}.p-4{padding:1rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-4{padding-left:1rem;padding-right:1rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-2\\.5{padding-top:.625rem;padding-bottom:.625rem}.pt-3{padding-top:.75rem}.text-center{text-align:center}.font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace}.font-sans{font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji",Segoe UI Symbol,"Noto Color Emoji"}.text-\\[10px\\]{font-size:10px}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.uppercase{text-transform:uppercase}.italic{font-style:italic}.text-blue-500{--tw-text-opacity: 1;color:rgb(59 130 246 / var(--tw-text-opacity, 1))}.text-blue-600{--tw-text-opacity: 1;color:rgb(37 99 235 / var(--tw-text-opacity, 1))}.text-orange-500{--tw-text-opacity: 1;color:rgb(249 115 22 / var(--tw-text-opacity, 1))}.text-orange-600{--tw-text-opacity: 1;color:rgb(234 88 12 / var(--tw-text-opacity, 1))}.text-white{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity, 1))}.text-zinc-400{--tw-text-opacity: 1;color:rgb(161 161 170 / var(--tw-text-opacity, 1))}.text-zinc-500{--tw-text-opacity: 1;color:rgb(113 113 122 / var(--tw-text-opacity, 1))}.text-zinc-900{--tw-text-opacity: 1;color:rgb(24 24 27 / var(--tw-text-opacity, 1))}.shadow-2xl{--tw-shadow: 0 25px 50px -12px rgb(0 0 0 / .25);--tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);--tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.shadow-xl{--tw-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);--tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.shadow-indigo-500\\/20{--tw-shadow-color: rgb(99 102 241 / .2);--tw-shadow: var(--tw-shadow-colored)}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.hover\\:scale-105:hover{--tw-scale-x: 1.05;--tw-scale-y: 1.05;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skew(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.hover\\:bg-indigo-600:hover{--tw-bg-opacity: 1;background-color:rgb(79 70 229 / var(--tw-bg-opacity, 1))}.hover\\:bg-indigo-700:hover{--tw-bg-opacity: 1;background-color:rgb(67 56 202 / var(--tw-bg-opacity, 1))}.hover\\:bg-zinc-200:hover{--tw-bg-opacity: 1;background-color:rgb(228 228 231 / var(--tw-bg-opacity, 1))}.active\\:scale-95:active{--tw-scale-x: .95;--tw-scale-y: .95;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skew(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}@media(prefers-color-scheme:dark){.dark\\:border-blue-900\\/30{border-color:#1e3a8a4d}.dark\\:border-orange-900\\/30{border-color:#7c2d124d}.dark\\:border-zinc-800{--tw-border-opacity: 1;border-color:rgb(39 39 42 / var(--tw-border-opacity, 1))}.dark\\:bg-blue-900\\/20{background-color:#1e3a8a33}.dark\\:bg-orange-900\\/20{background-color:#7c2d1233}.dark\\:bg-zinc-800{--tw-bg-opacity: 1;background-color:rgb(39 39 42 / var(--tw-bg-opacity, 1))}.dark\\:bg-zinc-900{--tw-bg-opacity: 1;background-color:rgb(24 24 27 / var(--tw-bg-opacity, 1))}.dark\\:text-blue-400{--tw-text-opacity: 1;color:rgb(96 165 250 / var(--tw-text-opacity, 1))}.dark\\:text-orange-400{--tw-text-opacity: 1;color:rgb(251 146 60 / var(--tw-text-opacity, 1))}.dark\\:text-white{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity, 1))}.dark\\:hover\\:bg-zinc-700:hover{--tw-bg-opacity: 1;background-color:rgb(63 63 70 / var(--tw-bg-opacity, 1))}}';
  const style = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: styleCss
  }, Symbol.toStringTag, { value: "Module" }));
  importCSS(styleCss);
  console.log("%c--- [FC-SBC] SCRIPT INJECTED & RUNNING ---", "background: #000; color: #fff; font-size: 20px;");
  const init = () => {
    if (document.getElementById("fc-sbc-builder-root")) return;
    const root = document.querySelector(".ut-root-view") || document.body;
    if (!root) return;
    console.log(`[FC-SBC] Mounting UI into ${root.tagName}...`);
    const container = document.createElement("div");
    container.id = "fc-sbc-builder-root";
    container.style.cssText = "position:fixed; top:0; left:0; z-index:9999999; pointer-events:none;";
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
    const root = document.querySelector(".ut-root-view");
    if (root) {
      clearInterval(checkUI);
      init();
    }
  }, 1e3);
  setInterval(() => {
    if (!document.getElementById("fc-sbc-builder-root")) init();
  }, 5e3);

})();