import { companionPose } from "./companionRig";

// Local inverse warps sample the approved painted pixels. Closed lids use a
// second raster sampled only inside four hand-positioned, feathered eye masks.
// Each channel has a separate spatial influence and an authored timeline.
const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0., 1.); }
`;
const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform sampler2D u_lids;
uniform vec2 u_size;
uniform vec4 u_eyes[4];
uniform vec4 u_angles;
uniform vec4 u_girlChest;
uniform vec4 u_catChest;
uniform vec4 u_ear;
uniform vec4 u_tail;
uniform vec4 u_body; // girl inhale, cat inhale, ear, tail
uniform vec2 u_blink;
uniform vec2 u_girlGaze;
uniform vec2 u_catGaze;
const float PAD = 18.;

float oval(vec2 p, vec4 area) {
  return 1. - smoothstep(0., 1., length((p - area.xy) / area.zw));
}
vec2 turn(vec2 p, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec2(p.x*c - p.y*s, p.x*s + p.y*c);
}
vec2 eye(vec2 p, vec4 area, float angle, float shut, vec2 gaze) {
  vec2 q = turn(p - area.xy, -angle);
  float inner = area.w;
  // The pupil/iris shift is bounded inside the eye, leaving its corners still.
  float pupil = 1. - smoothstep(0.28, 0.92, length(q / vec2(area.z, inner*1.2)));
  q -= turn(gaze, -angle) * pupil * (1. - shut);
  return area.xy + turn(q, angle);
}
float lidMask(vec2 p, vec4 area, float angle) {
  vec2 q = turn(p-area.xy, -angle);
  return 1. - smoothstep(0.84, 1.18, length(q/vec2(area.z*1.25, area.w*1.85)));
}

void main() {
  // Image-space y points down. Extra transparent border gives ears/tail room.
  vec2 p = vec2(v_uv.x, 1.-v_uv.y) * (u_size + PAD*2.) - PAD;
  float g = oval(p, u_girlChest);
  float c = oval(p, u_catChest);
  p.y += g * u_body.x * 7.0 + c * u_body.y * 5.8;
  p.x -= (p.x-u_girlChest.x) * g * u_body.x * 0.005;
  p.x -= (p.x-u_catChest.x) * c * u_body.y * 0.008;

  vec2 earDelta = p - u_ear.xy;
  float earAlong = clamp((u_ear.y-p.y)/(u_ear.y-u_ear.w),0.,1.);
  float earCenter = mix(u_ear.x,u_ear.z,earAlong);
  float earWidth = mix(59.,12.,earAlong);
  float earWeight = smoothstep(0.,1.,earAlong);
  earWeight *= smoothstep(u_ear.w-8.,u_ear.w+2.,p.y);
  earWeight *= 1.-smoothstep(earWidth*0.65,earWidth,abs(p.x-earCenter));
  p = mix(p, u_ear.xy + turn(earDelta, -u_body.z*0.09), earWeight);
  if (u_tail.x > 0.) {
    vec2 tailAxis = u_tail.zw-u_tail.xy;
    float along = dot(p-u_tail.xy,tailAxis)/max(1.,dot(tailAxis,tailAxis));
    vec2 nearest = u_tail.xy+clamp(along,0.,1.)*tailAxis;
    float tailWeight = smoothstep(0.05,0.7,along)*(1.-smoothstep(32.,72.,length(p-nearest)));
    p = mix(p, u_tail.xy + turn(p-u_tail.xy, -u_body.w*0.065), tailWeight);
  }

  vec2 still = p;
  p = eye(p, u_eyes[0], u_angles.x, u_blink.x, u_girlGaze);
  p = eye(p, u_eyes[1], u_angles.y, u_blink.x, u_girlGaze);
  p = eye(p, u_eyes[2], u_angles.z, u_blink.y, u_catGaze);
  p = eye(p, u_eyes[3], u_angles.w, u_blink.y, u_catGaze);
  if (min(p.x,p.y) < 0. || p.x > u_size.x || p.y > u_size.y) {
    gl_FragColor = vec4(0.); return;
  }
  vec4 pixel = texture2D(u_image, p/u_size);
  float girlMask = max(lidMask(still,u_eyes[0],u_angles.x),lidMask(still,u_eyes[1],u_angles.y));
  float catMask = max(lidMask(still,u_eyes[2],u_angles.z),lidMask(still,u_eyes[3],u_angles.w));
  float cover = max(girlMask*smoothstep(0.12,0.82,u_blink.x),catMask*smoothstep(0.12,0.82,u_blink.y));
  pixel = mix(pixel,texture2D(u_lids,still/u_size),cover);
  gl_FragColor = vec4(pixel.rgb * pixel.a, pixel.a);
}
`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    gl.deleteShader(result);
    throw new Error("Companion shader could not compile");
  }
  return result;
}

export function createCompanionRenderer(canvas, image, rig, lidsImage) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Companion program could not link");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  // Responsive artwork reuses the context, whose active unit was left at 1.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  const uniform = name => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform("u_image"), 0);
  const lidsTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, lidsTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lidsImage);
  gl.uniform1i(uniform("u_lids"), 1);
  gl.uniform2fv(uniform("u_size"), rig.size);
  gl.uniform4fv(uniform("u_eyes[0]"), rig.eyes.flat());
  gl.uniform4fv(uniform("u_angles"), rig.angles);
  gl.uniform4fv(uniform("u_girlChest"), rig.girlChest);
  gl.uniform4fv(uniform("u_catChest"), rig.catChest);
  gl.uniform4fv(uniform("u_ear"), rig.ear);
  gl.uniform4fv(uniform("u_tail"), rig.tail);
  const body = uniform("u_body"), blink = uniform("u_blink"), girlGaze = uniform("u_girlGaze"), catGaze = uniform("u_catGaze");
  let disposed = false;
  let needsMeasure = true;
  let density, pixelWidth, pixelHeight;
  let lastPhase, lastBlink;
  const observer = typeof window.ResizeObserver === "function"
    ? new window.ResizeObserver(() => { needsMeasure = true; })
    : null;
  observer?.observe(canvas);

  return {
    render(seconds, pointer = [0, 0]) {
      if (disposed || gl.isContextLost()) return false;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (needsMeasure || ratio !== density || !observer) {
        const width = Math.min(3200, Math.max(1, Math.round(canvas.getBoundingClientRect().width * ratio)));
        const height = Math.max(1, Math.round(width * (rig.size[1] + 36) / (rig.size[0] + 36)));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        if (width !== pixelWidth || height !== pixelHeight) {
          gl.viewport(0, 0, width, height);
          pixelWidth = width;
          pixelHeight = height;
        }
        density = ratio;
        needsMeasure = false;
      }
      const pose = companionPose(seconds, pointer);
      gl.uniform4f(body, pose.girlBreath, pose.catBreath, pose.ear, pose.tail);
      gl.uniform2f(blink, pose.girlBlink, pose.catBlink);
      gl.uniform2fv(girlGaze, pose.girlGaze); gl.uniform2fv(catGaze, pose.catGaze);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // Keep the inspection markers in step with the rendered pose.
      const phase = seconds.toFixed(2);
      const blinkState = `${pose.girlBlink.toFixed(2)},${pose.catBlink.toFixed(2)}`;
      if (phase !== lastPhase) { canvas.dataset.phase = phase; lastPhase = phase; }
      if (blinkState !== lastBlink) { canvas.dataset.blink = blinkState; lastBlink = blinkState; }
      return true;
    },
    dispose() {
      disposed = true;
      observer?.disconnect();
      gl.deleteTexture(texture); gl.deleteTexture(lidsTexture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
    },
  };
}
