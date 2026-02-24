// GLSL shaders for textured quad rendering

export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat4 u_combinedMatrix;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = u_combinedMatrix * vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

export const fragmentShaderSource = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform float u_opacity;
  varying vec2 v_texCoord;

  void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    // Texture is premultiplied, so just scale by opacity
    gl_FragColor = texColor * u_opacity;
  }
`
