import{r as b,_ as T,C as A,a as K,E as W,F as Y,o as Ie,L as ye,g as be,i as Te,c as $,b as Ae,v as ke,d as ve,e as L,f as Se}from"./firebase-config-BVNTNxBB.js";const J="@firebase/installations",F="0.6.19";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const X=1e4,Q=`w:${F}`,Z="FIS_v2",Ee="https://firebaseinstallations.googleapis.com/v1",Ce=60*60*1e3,Re="installations",_e="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const De={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},m=new W(Re,_e,De);function ee(e){return e instanceof Y&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function te({projectId:e}){return`${Ee}/projects/${e}/installations`}function ne(e){return{token:e.token,requestStatus:2,expiresIn:Pe(e.expiresIn),creationTime:Date.now()}}async function ae(e,t){const a=(await t.json()).error;return m.create("request-failed",{requestName:e,serverCode:a.code,serverMessage:a.message,serverStatus:a.status})}function ie({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Fe(e,{refreshToken:t}){const n=ie(e);return n.append("Authorization",Me(t)),n}async function re(e){const t=await e();return t.status>=500&&t.status<600?e():t}function Pe(e){return Number(e.replace("s","000"))}function Me(e){return`${Z} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ne({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const a=te(e),i=ie(e),r=t.getImmediate({optional:!0});if(r){const u=await r.getHeartbeatsHeader();u&&i.append("x-firebase-client",u)}const s={fid:n,authVersion:Z,appId:e.appId,sdkVersion:Q},o={method:"POST",headers:i,body:JSON.stringify(s)},c=await re(()=>fetch(a,o));if(c.ok){const u=await c.json();return{fid:u.fid||n,registrationStatus:2,refreshToken:u.refreshToken,authToken:ne(u.authToken)}}else throw await ae("Create Installation",c)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function se(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oe(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $e=/^[cdef][\w-]{21}$/,D="";function Le(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=xe(e);return $e.test(n)?n:D}catch{return D}}function xe(e){return Oe(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function v(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oe=new Map;function ce(e,t){const n=v(e);ue(n,t),qe(n,t)}function ue(e,t){const n=oe.get(e);if(n)for(const a of n)a(t)}function qe(e,t){const n=Ue();n&&n.postMessage({key:e,fid:t}),je()}let g=null;function Ue(){return!g&&"BroadcastChannel"in self&&(g=new BroadcastChannel("[Firebase] FID Change"),g.onmessage=e=>{ue(e.data.key,e.data.fid)}),g}function je(){oe.size===0&&g&&(g.close(),g=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Be="firebase-installations-database",Ve=1,w="firebase-installations-store";let E=null;function P(){return E||(E=Ie(Be,Ve,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(w)}}})),E}async function k(e,t){const n=v(e),i=(await P()).transaction(w,"readwrite"),r=i.objectStore(w),s=await r.get(n);return await r.put(t,n),await i.done,(!s||s.fid!==t.fid)&&ce(e,t.fid),t}async function le(e){const t=v(e),a=(await P()).transaction(w,"readwrite");await a.objectStore(w).delete(t),await a.done}async function S(e,t){const n=v(e),i=(await P()).transaction(w,"readwrite"),r=i.objectStore(w),s=await r.get(n),o=t(s);return o===void 0?await r.delete(n):await r.put(o,n),await i.done,o&&(!s||s.fid!==o.fid)&&ce(e,o.fid),o}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function M(e){let t;const n=await S(e.appConfig,a=>{const i=Ge(a),r=ze(e,i);return t=r.registrationPromise,r.installationEntry});return n.fid===D?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Ge(e){const t=e||{fid:Le(),registrationStatus:0};return de(t)}function ze(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const i=Promise.reject(m.create("app-offline"));return{installationEntry:t,registrationPromise:i}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},a=He(e,n);return{installationEntry:n,registrationPromise:a}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:Ke(e)}:{installationEntry:t}}async function He(e,t){try{const n=await Ne(e,t);return k(e.appConfig,n)}catch(n){throw ee(n)&&n.customData.serverCode===409?await le(e.appConfig):await k(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function Ke(e){let t=await x(e.appConfig);for(;t.registrationStatus===1;)await se(100),t=await x(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:a}=await M(e);return a||n}return t}function x(e){return S(e,t=>{if(!t)throw m.create("installation-not-found");return de(t)})}function de(e){return We(e)?{fid:e.fid,registrationStatus:0}:e}function We(e){return e.registrationStatus===1&&e.registrationTime+X<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ye({appConfig:e,heartbeatServiceProvider:t},n){const a=Je(e,n),i=Fe(e,n),r=t.getImmediate({optional:!0});if(r){const u=await r.getHeartbeatsHeader();u&&i.append("x-firebase-client",u)}const s={installation:{sdkVersion:Q,appId:e.appId}},o={method:"POST",headers:i,body:JSON.stringify(s)},c=await re(()=>fetch(a,o));if(c.ok){const u=await c.json();return ne(u)}else throw await ae("Generate Auth Token",c)}function Je(e,{fid:t}){return`${te(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function N(e,t=!1){let n;const a=await S(e.appConfig,r=>{if(!fe(r))throw m.create("not-registered");const s=r.authToken;if(!t&&Ze(s))return r;if(s.requestStatus===1)return n=Xe(e,t),r;{if(!navigator.onLine)throw m.create("app-offline");const o=tt(r);return n=Qe(e,o),o}});return n?await n:a.authToken}async function Xe(e,t){let n=await q(e.appConfig);for(;n.authToken.requestStatus===1;)await se(100),n=await q(e.appConfig);const a=n.authToken;return a.requestStatus===0?N(e,t):a}function q(e){return S(e,t=>{if(!fe(t))throw m.create("not-registered");const n=t.authToken;return nt(n)?{...t,authToken:{requestStatus:0}}:t})}async function Qe(e,t){try{const n=await Ye(e,t),a={...t,authToken:n};return await k(e.appConfig,a),n}catch(n){if(ee(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await le(e.appConfig);else{const a={...t,authToken:{requestStatus:0}};await k(e.appConfig,a)}throw n}}function fe(e){return e!==void 0&&e.registrationStatus===2}function Ze(e){return e.requestStatus===2&&!et(e)}function et(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Ce}function tt(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function nt(e){return e.requestStatus===1&&e.requestTime+X<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function at(e){const t=e,{installationEntry:n,registrationPromise:a}=await M(t);return a?a.catch(console.error):N(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function it(e,t=!1){const n=e;return await rt(n),(await N(n,t)).token}async function rt(e){const{registrationPromise:t}=await M(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function st(e){if(!e||!e.options)throw C("App Configuration");if(!e.name)throw C("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw C(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function C(e){return m.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pe="installations",ot="installations-internal",ct=e=>{const t=e.getProvider("app").getImmediate(),n=st(t),a=K(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:a,_delete:()=>Promise.resolve()}},ut=e=>{const t=e.getProvider("app").getImmediate(),n=K(t,pe).getImmediate();return{getId:()=>at(n),getToken:i=>it(n,i)}};function lt(){T(new A(pe,ct,"PUBLIC")),T(new A(ot,ut,"PRIVATE"))}lt();b(J,F);b(J,F,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const U="analytics",dt="firebase_id",ft="origin",pt=60*1e3,ht="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",O="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const l=new ye("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gt={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},d=new W("analytics","Analytics",gt);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mt(e){if(!e.startsWith(O)){const t=d.create("invalid-gtag-resource",{gtagURL:e});return l.warn(t.message),""}return e}function he(e){return Promise.all(e.map(t=>t.catch(n=>n)))}function wt(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function It(e,t){const n=wt("firebase-js-sdk-policy",{createScriptURL:mt}),a=document.createElement("script"),i=`${O}?l=${e}&id=${t}`;a.src=n?n==null?void 0:n.createScriptURL(i):i,a.async=!0,document.head.appendChild(a)}function yt(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function bt(e,t,n,a,i,r){const s=a[i];try{if(s)await t[s];else{const c=(await he(n)).find(u=>u.measurementId===i);c&&await t[c.appId]}}catch(o){l.error(o)}e("config",i,r)}async function Tt(e,t,n,a,i){try{let r=[];if(i&&i.send_to){let s=i.send_to;Array.isArray(s)||(s=[s]);const o=await he(n);for(const c of s){const u=o.find(p=>p.measurementId===c),f=u&&t[u.appId];if(f)r.push(f);else{r=[];break}}}r.length===0&&(r=Object.values(t)),await Promise.all(r),e("event",a,i||{})}catch(r){l.error(r)}}function At(e,t,n,a){async function i(r,...s){try{if(r==="event"){const[o,c]=s;await Tt(e,t,n,o,c)}else if(r==="config"){const[o,c]=s;await bt(e,t,n,a,o,c)}else if(r==="consent"){const[o,c]=s;e("consent",o,c)}else if(r==="get"){const[o,c,u]=s;e("get",o,c,u)}else if(r==="set"){const[o]=s;e("set",o)}else e(r,...s)}catch(o){l.error(o)}}return i}function kt(e,t,n,a,i){let r=function(...s){window[a].push(arguments)};return window[i]&&typeof window[i]=="function"&&(r=window[i]),window[i]=At(r,e,t,n),{gtagCore:r,wrappedGtag:window[i]}}function vt(e){const t=window.document.getElementsByTagName("script");for(const n of Object.values(t))if(n.src&&n.src.includes(O)&&n.src.includes(e))return n;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const St=30,Et=1e3;class Ct{constructor(t={},n=Et){this.throttleMetadata=t,this.intervalMillis=n}getThrottleMetadata(t){return this.throttleMetadata[t]}setThrottleMetadata(t,n){this.throttleMetadata[t]=n}deleteThrottleMetadata(t){delete this.throttleMetadata[t]}}const ge=new Ct;function Rt(e){return new Headers({Accept:"application/json","x-goog-api-key":e})}async function _t(e){var s;const{appId:t,apiKey:n}=e,a={method:"GET",headers:Rt(n)},i=ht.replace("{app-id}",t),r=await fetch(i,a);if(r.status!==200&&r.status!==304){let o="";try{const c=await r.json();(s=c.error)!=null&&s.message&&(o=c.error.message)}catch{}throw d.create("config-fetch-failed",{httpStatus:r.status,responseMessage:o})}return r.json()}async function Dt(e,t=ge,n){const{appId:a,apiKey:i,measurementId:r}=e.options;if(!a)throw d.create("no-app-id");if(!i){if(r)return{measurementId:r,appId:a};throw d.create("no-api-key")}const s=t.getThrottleMetadata(a)||{backoffCount:0,throttleEndTimeMillis:Date.now()},o=new Mt;return setTimeout(async()=>{o.abort()},pt),me({appId:a,apiKey:i,measurementId:r},s,o,t)}async function me(e,{throttleEndTimeMillis:t,backoffCount:n},a,i=ge){var o;const{appId:r,measurementId:s}=e;try{await Ft(a,t)}catch(c){if(s)return l.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${c==null?void 0:c.message}]`),{appId:r,measurementId:s};throw c}try{const c=await _t(e);return i.deleteThrottleMetadata(r),c}catch(c){const u=c;if(!Pt(u)){if(i.deleteThrottleMetadata(r),s)return l.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${s} provided in the "measurementId" field in the local Firebase config. [${u==null?void 0:u.message}]`),{appId:r,measurementId:s};throw c}const f=Number((o=u==null?void 0:u.customData)==null?void 0:o.httpStatus)===503?$(n,i.intervalMillis,St):$(n,i.intervalMillis),p={throttleEndTimeMillis:Date.now()+f,backoffCount:n+1};return i.setThrottleMetadata(r,p),l.debug(`Calling attemptFetch again in ${f} millis`),me(e,p,a,i)}}function Ft(e,t){return new Promise((n,a)=>{const i=Math.max(t-Date.now(),0),r=setTimeout(n,i);e.addEventListener(()=>{clearTimeout(r),a(d.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function Pt(e){if(!(e instanceof Y)||!e.customData)return!1;const t=Number(e.customData.httpStatus);return t===429||t===500||t===503||t===504}class Mt{constructor(){this.listeners=[]}addEventListener(t){this.listeners.push(t)}abort(){this.listeners.forEach(t=>t())}}async function Nt(e,t,n,a,i){if(i&&i.global){e("event",n,a);return}else{const r=await t,s={...a,send_to:r};e("event",n,s)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ot(){if(Ae())try{await ke()}catch(e){return l.warn(d.create("indexeddb-unavailable",{errorInfo:e==null?void 0:e.toString()}).message),!1}else return l.warn(d.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function $t(e,t,n,a,i,r,s){const o=Dt(e);o.then(h=>{n[h.measurementId]=h.appId,e.options.measurementId&&h.measurementId!==e.options.measurementId&&l.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${h.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(h=>l.error(h)),t.push(o);const c=Ot().then(h=>{if(h)return a.getId()}),[u,f]=await Promise.all([o,c]);vt(r)||It(r,u.measurementId),i("js",new Date);const p=(s==null?void 0:s.config)??{};return p[ft]="firebase",p.update=!0,f!=null&&(p[dt]=f),i("config",u.measurementId,p),u.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(t){this.app=t}_delete(){return delete y[this.app.options.appId],Promise.resolve()}}let y={},j=[];const B={};let R="dataLayer",xt="gtag",V,we,G=!1;function qt(){const e=[];if(Te()&&e.push("This is a browser extension environment."),ve()||e.push("Cookies are not available."),e.length>0){const t=e.map((a,i)=>`(${i+1}) ${a}`).join(" "),n=d.create("invalid-analytics-context",{errorInfo:t});l.warn(n.message)}}function Ut(e,t,n){qt();const a=e.options.appId;if(!a)throw d.create("no-app-id");if(!e.options.apiKey)if(e.options.measurementId)l.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw d.create("no-api-key");if(y[a]!=null)throw d.create("already-exists",{id:a});if(!G){yt(R);const{wrappedGtag:r,gtagCore:s}=kt(y,j,B,R,xt);we=r,V=s,G=!0}return y[a]=$t(e,j,B,t,V,R,n),new Lt(e)}function jt(e,t,n,a){e=be(e),Nt(we,y[e.app.options.appId],t,n,a).catch(i=>l.error(i))}const z="@firebase/analytics",H="0.10.18";function Bt(){T(new A(U,(t,{options:n})=>{const a=t.getProvider("app").getImmediate(),i=t.getProvider("installations-internal").getImmediate();return Ut(a,i,n)},"PUBLIC")),T(new A("analytics-internal",e,"PRIVATE")),b(z,H),b(z,H,"esm2020");function e(t){try{const n=t.getProvider(U).getImmediate();return{logEvent:(a,i,r)=>jt(n,a,i,r)}}catch(n){throw d.create("interop-component-reg-failed",{reason:n})}}}Bt();const _=(e,t)=>{};class I{constructor(){this.currentUser=null,this.authToken=null,this.initializeAuthListener()}static getInstance(){return I.instance||(I.instance=new I),I.instance}initializeAuthListener(){if(!L){console.log("Firebase Auth not available");return}setTimeout(()=>{try{Se(L,async t=>{var n;if(this.currentUser=t,t)try{const a=await t.getIdToken();this.authToken=a,console.log("Firebase Auth: User signed in, ID token obtained"),_("firebase_auth_success",{user_id:t.uid,provider:((n=t.providerData[0])==null?void 0:n.providerId)||"unknown"});const i=await t.getIdToken(!0);console.log("Firebase Auth: Fresh token obtained")}catch(a){console.error("Firebase Auth: Error getting ID token:",a),_("firebase_auth_error",{error_type:"token_fetch_failed",error_message:a instanceof Error?a.message:"Unknown error"})}else this.authToken=null,console.log("Firebase Auth: No user signed in"),_("firebase_auth_signout")})}catch(t){console.error("Firebase Auth: Error initializing auth listener:",t)}},100)}getCurrentUser(){return this.currentUser}async getIdToken(t=!1){if(!this.currentUser)return console.log("Firebase Auth: No user signed in, no ID token available"),null;try{const n=await this.currentUser.getIdToken(t);return this.authToken=n,n}catch(n){return console.error("Firebase Auth: Error getting ID token:",n),null}}isAuthenticated(){return this.currentUser!==null}getAuthStatus(){var t,n,a;return{isAuthenticated:this.isAuthenticated(),user:this.currentUser,token:this.authToken,uid:((t=this.currentUser)==null?void 0:t.uid)||null,email:((n=this.currentUser)==null?void 0:n.email)||null,phone:((a=this.currentUser)==null?void 0:a.phoneNumber)||null}}}const Gt=I.getInstance();export{I as FirebaseAuthManager,Gt as firebaseAuthManager};
