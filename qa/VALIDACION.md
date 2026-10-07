# Validación de Circle vs Geometry

Las pruebas automáticas guardan resultados reales en [validation.json](validation.json)
y [engines.json](engines.json), con capturas PNG en esta carpeta.

## Cobertura automática

- Edge/Chromium: diez tamaños de ordenador, móvil y tablet, vertical/horizontal,
  incluidos iframe de ordenador y móvil. Cada perfil tiene un contexto independiente.
- Movimiento con un dedo y DASH/ULT con el segundo mediante eventos táctiles del
  protocolo del navegador; desbloqueo y recarga de habilidades.
- Menús dentro del área visible, selección de mejoras desplazable y ayudas iniciales.
- SDK simulado: inicio/fin de juego, anuncio completo, anuncio deshabilitado,
  errores, bloqueo de interfaz, silencio, recuperación y almacenamiento denegado.
- WebKit en Windows: ordenador, tamaño de iPhone y tablet en iframe; idioma español,
  volumen, botones táctiles, pausa, mejoras, fin de partida y reinicio.
- SDK CrazyGames v3 real: inicialización en localhost y anuncio de demostración
  con recuperación del juego y del sonido. No son anuncios comerciales.
- Rendimiento: actualización y renderizado completos con 260 enemigos al inicio,
  cinco armas al máximo, cinco pasivas, partículas y definitiva orbital. El promedio
  corresponde al ordenador de ejecución; no equivale a FPS en un teléfono.

## Repetir las pruebas

Desde `vs-clone`:

```powershell
npm install
npm test
npm run test:browser
npm run test:standalone
npm run test:devices
npx playwright install webkit
npm run test:engines
./scripts/package-crazygames.ps1
```

## Pendiente en dispositivos físicos y en el portal

Todavía hay que completar estas comprobaciones en Chrome/Android, Safari/iPhone
y una tablet. Los perfiles emulados y WebKit en Windows no ejecutan sus sistemas
operativos ni reproducen todas las interrupciones de audio o áreas con notch.

Para abrir el juego desde un teléfono conectado a la misma red que el ordenador:

```powershell
$env:NIGHTFALL_HOST = '0.0.0.0'
npm start
```

Abre `http://IP-LOCAL-DEL-ORDENADOR:8080/` en el teléfono. Al terminar, detén el
servidor con Ctrl+C y elimina la variable con `Remove-Item Env:NIGHTFALL_HOST`.
El servidor sigue limitado a localhost si no se configura esa variable.

1. Moverse mientras se pulsa DASH y ULT; soltar/cancelar los dedos y comprobar que
   el personaje deja de moverse. Rotar entre vertical y horizontal sin perder la partida.
2. Revisar el notch, la barra del sistema, texto, pausa, botones y las tres mejoras.
   La tarjeta inferior debe poder desplazarse y seleccionarse.
3. Cambiar de aplicación y volver: la partida debe quedar pausada; al tocar Continuar,
   recuperar el sonido. Comprobar también una interrupción de audio del sistema.
4. Jugar al menos diez minutos con varias armas y hordas; observar calentamiento,
   consumo de memoria, fluidez y legibilidad de efectos.
5. Probar almacenamiento bloqueado/modo privado: poder perder y volver a intentar.
   Si no hay almacenamiento disponible, la persistencia entre visitas no es posible.
6. En la vista previa de CrazyGames, activar **Progress Save**, verificar inglés/español
   según el locale del SDK y guardar/recuperar el récord con el módulo Data.
7. En Basic Launch, comprobar que los anuncios deshabilitados permiten reiniciar.
   En una prueba autorizada de anuncios del portal, verificar bloqueo, silencio,
   finalización/error y recuperación. Full Launch habilita la monetización.

Documentación del portal: [SDK v3](https://docs.crazygames.com/sdk/intro/),
[anuncios](https://docs.crazygames.com/requirements/ads/) y
[guardado](https://docs.crazygames.com/sdk/data/).
