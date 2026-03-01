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
    // Negative LOD bias (-0.5) selects a higher-resolution mipmap level
    // for sharper texture rendering
    vec4 texColor = texture2D(u_texture, v_texCoord, -0.5);
    // Texture is premultiplied, so just scale by opacity
    gl_FragColor = texColor * u_opacity;
  }
`

// GLSL shaders for 3D mesh rendering (Blinn-Phong lighting)

export const meshVertexShaderSource = `
  attribute vec3 a_position3D;
  attribute vec3 a_normal;
  attribute vec2 a_texCoord3D;
  uniform mat4 u_mvp;
  uniform mat4 u_modelView;
  uniform mat3 u_normalMatrix;
  varying vec3 v_normal;
  varying vec2 v_texCoord;
  varying vec3 v_viewPos;

  void main() {
    gl_Position = u_mvp * vec4(a_position3D, 1.0);
    v_normal = normalize(u_normalMatrix * a_normal);
    v_texCoord = a_texCoord3D;
    v_viewPos = (u_modelView * vec4(a_position3D, 1.0)).xyz;
  }
`

export const meshFragmentShaderSource = `
  precision highp float;
  uniform vec4 u_baseColor;
  uniform sampler2D u_meshTexture;
  uniform bool u_hasTexture;
  uniform float u_meshOpacity;
  uniform vec3 u_lightDir;
  uniform vec3 u_ambientColor;
  uniform float u_roughness;
  uniform float u_metallic;

  varying vec3 v_normal;
  varying vec2 v_texCoord;
  varying vec3 v_viewPos;

  void main() {
    vec4 color = u_baseColor;
    if (u_hasTexture) {
      color *= texture2D(u_meshTexture, v_texCoord);
    }
    vec3 normal = normalize(v_normal);

    // Diffuse — scaled down for soft, low-contrast look
    float NdotL = max(dot(normal, u_lightDir), 0.0);
    float diffuseStrength = 0.7;

    // Blinn-Phong specular
    vec3 viewDir = normalize(-v_viewPos);
    vec3 halfDir = normalize(u_lightDir + viewDir);
    float NdotH = max(dot(normal, halfDir), 0.0);
    // Map roughness to shininess: low roughness = tight highlight (plastic sheen)
    float shininess = mix(256.0, 4.0, u_roughness * u_roughness);
    float spec = pow(NdotH, shininess);
    // Metallic surfaces tint specular with base color, dielectrics use white
    vec3 specColor = mix(vec3(0.04), color.rgb, u_metallic);
    vec3 specular = specColor * spec * diffuseStrength;

    vec3 lit = color.rgb * (u_ambientColor + vec3(NdotL * diffuseStrength)) + specular;
    gl_FragColor = vec4(lit, color.a * u_meshOpacity);
  }
`
