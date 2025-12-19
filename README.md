# Acebsa Bingo - Docker

Instrucciones rápidas para construir y ejecutar la web en Docker.

Construir la imagen:

```powershell
cd "c:\Users\Pau Domenech\Desktop\BINGO"
docker build -t acebsa-bingo .
```

Ejecutar el contenedor (mapear puerto 3000):

```powershell
docker run --rm -p 3000:3000 acebsa-bingo
```

Abrir en el navegador: http://localhost:3000

Notas:
- El `Dockerfile` usa `npm install --production`. Si desea dependencias de desarrollo, modifique la instrucción.
- Si no tiene Docker instalado, siga las instrucciones en https://docs.docker.com/get-docker/.
