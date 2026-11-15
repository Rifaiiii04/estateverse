import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { File, Paths } from 'expo-file-system';

const VERTEX = `attribute vec2 position; varying vec2 uv;
void main(){ uv=position*0.5+0.5; gl_Position=vec4(position,0.0,1.0); }`;
const FRAGMENT = `precision highp float; varying vec2 uv; uniform sampler2D panorama;
uniform vec2 viewAngles; uniform float aspect;
void main(){
  vec2 p=(uv*2.0-1.0)*vec2(aspect,1.0)*0.767327;
  vec3 d=normalize(vec3(p,-1.0));
  float cp=cos(viewAngles.y),sp=sin(viewAngles.y),cy=cos(viewAngles.x),sy=sin(viewAngles.x);
  vec3 t=vec3(d.x,cp*d.y-sp*d.z,sp*d.y+cp*d.z);
  vec3 world=vec3(cy*t.x-sy*t.z,t.y,sy*t.x+cy*t.z);
  vec2 sphere=vec2(atan(world.x,-world.z)/6.283185307+0.5,0.5-asin(clamp(world.y,-1.0,1.0))/3.141592654);
  gl_FragColor=texture2D(panorama,sphere);
}`;

export interface PanoramaRenderer { draw(yaw: number, pitch: number): void; dispose(): void }

// compileShader verifies native shader compilation instead of silently showing a black panorama.
function compileShader(gl: ExpoWebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('GPU tidak dapat membuat shader panorama.');
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('GPU tidak mendukung viewer panorama.'); }
  return shader;
}

// createPanoramaRenderer displays the existing server panorama using spherical projection; it never stitches photos.
export async function createPanoramaRenderer(gl: ExpoWebGLRenderingContext, url: string): Promise<PanoramaRenderer> {
  const file = await File.downloadFileAsync(url, new File(Paths.cache, `panorama-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`));
  const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
  const shaders: WebGLShader[] = [];
  // dispose releases the downloaded preview and native GPU resources for the previous room.
  const dispose = () => {
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
    if (file.exists) file.delete();
  };
  try {
    if (!program || !buffer || !texture) throw new Error('GPU tidak tersedia.');
    shaders.push(compileShader(gl, gl.VERTEX_SHADER, VERTEX));
    shaders.push(compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    shaders.forEach((shader) => gl.attachShader(program, shader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Viewer panorama gagal diinisialisasi.');
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, { localUri: file.uri } as unknown as TexImageSource);
    gl.uniform1i(gl.getUniformLocation(program, 'panorama'), 0);
    const angles = gl.getUniformLocation(program, 'viewAngles');
    const aspect = gl.getUniformLocation(program, 'aspect');
    return { dispose, draw: (yaw, pitch) => {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(angles, yaw*Math.PI/180, pitch*Math.PI/180);
      gl.uniform1f(aspect, gl.drawingBufferWidth/gl.drawingBufferHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.endFrameEXP();
    } };
  } catch (error) { dispose(); throw error; }
}
