# POCOrganigrama

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.10.

## Organigrama reutilizable

### Demostracion independiente (sin Storybook)

Ejecuta `npm start` y abre **http://localhost:4200/demo/org-chart**.
La pantalla de procesos permanece en **http://localhost:4200/**.
No se instala ni se necesita Storybook.

El consumidor de ejemplo es `src/app/org-chart-demo.ts`, con plantilla
`src/app/org-chart-playground.html` y estilos propios. No usa los modelos
de procesos: consume exclusivamente las exportaciones de `src/app/org-chart/index.ts`.
El componente reutilizable esta aislado en `src/app/org-chart/`, con estilos
propios y sin dependencia de los formularios o del panel lateral.

- **Crear:** `startCreate()` abre un formulario vacio, con el nodo seleccionado
	como padre; `save()` llama a `addOrgNode` y selecciona el nuevo nodo.
- **Editar:** `selectNode()` carga el formulario; `save()` llama a `updateOrgNode`.
	El ID permanece estable. Cambiar el padre tambien valida la jerarquia.
- **Eliminar:** `remove()` llama a `removeOrgNode`. Si hay hijos se rechaza
	la operacion, salvo que marques la casilla de eliminar descendientes.
	Borrar la raiz con cascada deja el grafico vacio y permite crear otra raiz.
- **Restablecer:** `reset()` recupera los tres nodos iniciales.
- **Seleccionar:** hacer clic en una tarjeta o en el directorio emite
	`nodeSelected`. El consumidor conserva el ID y muestra nombre, cargo, area,
	correo e ID en un panel lateral, debajo del grafico en pantallas pequenas.

Los datos solo viven en memoria; recargar o restablecer descarta los cambios.
Los errores de validacion se muestran sin reemplazar los datos validos actuales.
El formulario usa Reactive Forms y las operaciones del modelo son inmutables.

### API Publica

Importa desde `./org-chart` en un consumidor situado en `src/app`:

```typescript
import { OrgChartComponent, OrgNode, addOrgNode, updateOrgNode, removeOrgNode } from './org-chart';
```

Agrega `OrgChartComponent` a `imports`. Sus entradas son `nodes` (obligatoria),
`cardFields` (filas adicionales), `selectedNodeId` (resaltado), `nodeWidth`
(240), `nodeHeight` (112) y `height` (580), con dimensiones en pixeles.
Emite `nodeSelected: OrgNode<T>`. Los metodos publicos `fit()`, `zoomIn()`,
`zoomOut()`, `expandAll()` y `collapseAll()` controlan la vista; no cambian
los datos. Los controles integrados ya invocan estos metodos.

Ejemplo de conexion con tu propio panel:

```html
<app-org-chart
	[nodes]="nodes()"
	[selectedNodeId]="selectedId()"
	(nodeSelected)="selectedId.set($event.id)"
/>
@if (selected(); as node) {
	<aside aria-label="Detalle del nodo">
		<h2>{{ node.name }}</h2>
		<p>{{ node.role }}</p>
	</aside>
}
```

En el consumidor, declara `selectedId = signal<string | null>(null)` y
`selected = computed(() => nodes().find(node => node.id === selectedId()))`.
Derivar la seleccion desde el arreglo mantiene el panel actualizado al editar.
La ubicacion y el contenido del panel pertenecen al consumidor, no al chart.

### Ejemplo implementado: procesos y participantes

La pantalla inicial ahora muestra procesos con titulo, subtitulo y participantes
asignados. `src/app/process.model.ts` contiene los contratos `Proceso`, `Persona`,
`Cargo` y `Participante`, ademas de `buildProcessNodes` y `assignParticipant`.
El componente generico del grafico no conoce estos modelos de negocio.

- `parentId` relaciona procesos. El adaptador genera ademas un nodo hijo
	independiente por cada participante asignado a un proceso.
- El cargo pertenece a la asignacion. Una persona puede participar en varios
	procesos o tener cargos diferentes en uno; no se permite repetir la misma
	combinacion persona/cargo dentro de un proceso.
- El formulario de nuevo proceso crea un hijo del proceso padre elegido.
- El formulario de participantes usa los catalogos locales `personas` y `cargos`
	de `src/app/app.ts`; puedes reemplazarlos por datos de tu API.
- La tarjeta de proceso muestra titulo y subtitulo; la tarjeta de participante
	muestra nombre y cargo. Los participantes ya no son filas de la tarjeta de proceso.
- Al seleccionar un proceso o uno de sus participantes en el grafico o el
	directorio, aparece el detalle del proceso con la lista completa y controles
	para retirar asignaciones. Retirar una asignacion elimina tambien su nodo hijo.
- El estado vive en signals y se actualiza sin mutaciones. No hay persistencia:
	recargar la pagina restaura los datos de ejemplo.

Ejemplo de datos compatibles con el adaptador:

```typescript
import { buildProcessNodes, Proceso } from './process.model';

const procesos: readonly Proceso[] = [{
	id: 'compras',
	parentId: null,
	titulo: 'Compras',
	subtitulo: 'Gestion de proveedores',
	participantes: [{
		persona: { id: 'ana', nombre: 'Ana Martinez', correo: 'ana@example.com' },
		cargo: { id: 'lider', nombre: 'Lider de proceso' },
	}],
}];
const nodes = buildProcessNodes(procesos);
```

El ejemplo produce dos nodos conectados: `Compras` -> `Ana Martinez` (Lider de proceso).
Los subprocesos siguen siendo hijos del proceso padre, al mismo nivel que sus
participantes; las personas no se convierten en padres de los subprocesos.

La ruta del import supone un consumidor en `src/app`. El adaptador devuelve
`OrgNode<ProcessNodeData>[]`. Usa `node.data?.kind` para distinguir:

- `process`: el proceso completo esta en `node.data.proceso`.
- `participant`: la asignacion esta en `node.data.participante` y el ID de negocio
	del proceso propietario en `node.data.procesoId`.

Los IDs visuales son tuplas serializadas con `JSON.stringify`: `['process', id]`
para procesos y `['participant', procesoId, personaId, cargoId]` para asignaciones.
Son estables y evitan colisiones cuando la misma persona participa en varios
procesos o cargos. No uses el ID visual para consultar una API de procesos:
obtiene el ID de negocio de los datos tipados del nodo.

El adaptador valida titulo/subtitulo, participantes, duplicados y la jerarquia
antes de generar el arbol mixto. Los ejemplos de empleados siguientes siguen siendo
validos para consumir el componente generico, pero ya no son el demo inicial.
La ruta tecnica posterior es una propuesta de evolucion, no una libreria
publicada ni una estructura de carpetas ya extraida.

La pantalla inicial incluye una demostracion de `d3-org-chart` con Tailwind CSS.
Permite agregar colaboradores, seleccionar nodos, ampliar, reducir, ajustar,
expandir y contraer la jerarquia. Los cambios del ejemplo viven en memoria;
no se guardan en un servidor.

- `src/app/org-chart/org-chart.model.ts`: contrato generico `OrgNode<T>` y funciones puras.
- `src/app/org-chart/org-chart.ts`: componente standalone con carga de D3 solo en navegador.
- `src/app/org-chart/org-chart.html`: controles y directorio accesible.
- `src/app/app.ts`: adaptacion de datos y ejemplo de actualizacion con signals.
- `src/app/org-chart-demo.html`: formulario y pantalla de ejemplo con Tailwind.

### Como funciona

1. El componente padre obtiene datos de una API o de una lista local.
2. `buildOrgNodes` transforma esos registros al contrato `OrgNode<T>` y valida la jerarquia.
3. Un `signal` conserva los nodos. La plantilla los envia mediante `[nodes]`.
4. `OrgChartComponent` importa D3 despues del primer renderizado del navegador. No intenta acceder al DOM durante SSR.
5. Un `effect` observa los nodos, las dimensiones y `cardFields`; configura D3 y vuelve a dibujar cuando cambian.
6. D3 recibe copias superficiales de los nodos para agregar sus campos internos sin modificar los originales. `data` conserva su referencia: tratarlo como inmutable.
7. Al seleccionar una tarjeta se emite `nodeSelected` con el nodo original y sus datos tipados.
8. Al destruir el componente se limpia el grafico y su listener de redimensionamiento.

El formulario pertenece a la demostracion, no al componente reutilizable.
Puedes usar `app-org-chart` en otra pantalla sin incluir el formulario.

### Adaptar un modelo de API

```typescript
interface Employee {
	employeeId: number;
	managerId: number | null;
	fullName: string;
	position: string;
	department: string;
}

const nodes = signal(buildOrgNodes(employees, (employee: Employee) => ({
	id: String(employee.employeeId),
	parentId: employee.managerId === null ? null : String(employee.managerId),
	name: employee.fullName,
	role: employee.position,
	data: employee,
})));
```

Importar `OrgChartComponent` en `imports` del componente consumidor y
`buildOrgNodes`, `addOrgNode`, `OrgNode` desde el archivo del modelo.

```html
<app-org-chart
	[nodes]="nodes()"
	[nodeWidth]="260"
	[nodeHeight]="120"
	[height]="640"
	(nodeSelected)="selected.set($event)"
/>
```

`selected` puede declararse como `signal<OrgNode<Employee> | null>(null)`.
El evento conserva el tipo de `data` y devuelve el nodo original, sin los
campos internos que D3 agrega a sus propias copias.

### Funciones auxiliares

- `buildOrgNodes(items, mapNode)`: convierte datos de cualquier origen y valida el resultado.
- `validateOrgNodes(nodes)`: permite listas vacias; exige una sola raiz (`parentId: null`), IDs no vacios y unicos, padres existentes y ausencia de ciclos. Lanza `Error` si la jerarquia no es valida.
- `addOrgNode(nodes, node)`: devuelve un nuevo arreglo validado, sin modificar el original. Usar con `nodes.update(current => addOrgNode(current, nuevoNodo))`.
- `updateOrgNode(nodes, id, changes)`: edita nombre, cargo, datos o padre y valida el resultado; no permite cambiar el ID. Rechaza IDs inexistentes, ciclos y padres inexistentes.
- `removeOrgNode(nodes, id, { cascade: false })`: elimina una hoja. Con `{ cascade: true }` elimina el nodo y todos sus descendientes. Rechaza IDs inexistentes y el borrado de una rama sin cascada explicita.

```typescript
nodes.update(current => addOrgNode(current, nuevoNodo));
nodes.update(current => updateOrgNode(current, id, { name: 'Nuevo nombre' }));
nodes.update(current => removeOrgNode(current, id));
// Eliminacion intencional de una rama completa:
nodes.update(current => removeOrgNode(current, id, { cascade: true }));
```

Los IDs y `parentId` son cadenas; convertir IDs numericos en el adaptador.
Al actualizar datos desde HTTP, llamar a `nodes.set(buildOrgNodes(response, mapNode))`.
Reemplazar el arreglo en lugar de mutarlo para activar la actualizacion del componente.

### Guia de personalizacion: donde modificar

Esta guia se refiere a la demo **`/demo/org-chart`**. La tarjeta del grafico,
el panel lateral y el formulario son vistas distintas: cambiar una no cambia
automaticamente las otras.

| Necesito cambiar | Archivo y punto concreto |
| --- | --- |
| Propiedades de negocio del nodo | [src/app/org-chart-demo.ts](src/app/org-chart-demo.ts): interfaz `DemoData`. |
| Datos iniciales o valores de ejemplo | [src/app/org-chart-demo.ts](src/app/org-chart-demo.ts): `initialNodes()`. Si usas una API, adapta su respuesta antes de asignar `nodes`. |
| Filas adicionales visibles en la tarjeta | [src/app/org-chart-demo.ts](src/app/org-chart-demo.ts): `cardFields`. Tambien afecta al directorio accesible. |
| Distribucion, avatar, colores o tipografia de la tarjeta | [src/app/org-chart/org-chart.ts](src/app/org-chart/org-chart.ts): `nodeContent()` y sus bloques `Object.assign(...style, ...)`. Afecta a todas las instancias del componente. |
| Datos mostrados al seleccionar un nodo | [src/app/org-chart-playground.html](src/app/org-chart-playground.html): `<dl>` dentro del `<aside>`. |
| Campos que el usuario puede crear o editar | [src/app/org-chart-demo.ts](src/app/org-chart-demo.ts): `form`, `selectNode()` y `save()`; y [src/app/org-chart-playground.html](src/app/org-chart-playground.html): controles del `<form>`. |
| Ancho y alto de las tarjetas | [src/app/org-chart-playground.html](src/app/org-chart-playground.html): `[nodeWidth]` y `[nodeHeight]`. `[height]` cambia el alto del lienzo, no de la tarjeta. |
| Posicion del panel y distribucion responsive | [src/app/org-chart-playground.css](src/app/org-chart-playground.css): `main`, `aside` y la media query. |
| Barra de herramientas, directorio y estados | [src/app/org-chart/org-chart.html](src/app/org-chart/org-chart.html) y [src/app/org-chart/org-chart.css](src/app/org-chart/org-chart.css). |

No necesitas cambiar el componente generico para agregar propiedades de negocio.
Conserva `id`, `parentId`, `name` y `role` del contrato `OrgNode<T>` y coloca
tus propiedades en `data`. `name` y `role` pueden representar titulo y subtitulo
de cualquier entidad. Si quieres ocultarlos visualmente, modifica el renderizado;
quitarlos del contrato requiere cambiar tambien sus consumidores.

#### Ejemplo: agregar la propiedad sede (`office`)

Los fragmentos siguientes son cambios para aplicar en los puntos indicados,
no un segundo componente completo.

1. En [src/app/org-chart-demo.ts](src/app/org-chart-demo.ts), agrega la propiedad
	 a `DemoData`. Si es obligatoria, debes incluirla tambien en todos los datos iniciales.

```typescript
interface DemoData {
	readonly department: string;
	readonly email: string;
	readonly office?: string;
}
```

2. En `initialNodes()`, agrega `office` al objeto `data` de los nodos que tengan sede.
	 Por ejemplo, los datos de Ana pueden ser:

```typescript
data: { department: 'Direccion', email: 'ana@example.com', office: 'Bogota' }
```

3. En el mismo archivo, agrega un control al `FormGroup` existente:

```typescript
office: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
```

4. En `selectNode()`, agrega `office: node.data?.office ?? ''` al objeto de
	 `this.form.reset(...)`. Esto carga la sede al seleccionar y editar un nodo.
	 `startCreate()` ya reinicia los controles: el nuevo campo comenzara vacio.

5. En `save()`, reemplaza el objeto `data` que construye el nodo por:

```typescript
data: {
	department: values.department.trim(),
	email: values.email.trim(),
	office: values.office.trim(),
},
```

6. Para mostrar la sede en la tarjeta, reemplaza `cardFields` por:

```typescript
readonly cardFields = (node: OrgNode<DemoData>): readonly OrgCardField[] => [
	{ label: 'Area', value: node.data?.department },
	{ label: 'Sede', value: node.data?.office },
];
```

7. En [src/app/org-chart-playground.html](src/app/org-chart-playground.html),
	 agrega este control dentro del `<form>`:

```html
<label for="node-office">Sede
	<input id="node-office" formControlName="office" maxlength="80">
</label>
```

Agrega tambien esta fila dentro del `<dl>` del detalle lateral:

```html
<dt>Sede</dt><dd>{{ node.data?.office || '-' }}</dd>
```

Si las filas ya no caben en la tarjeta, aumenta `[nodeHeight]`, por ejemplo
de `140` a `170`. Agregar datos no ajusta automaticamente las dimensiones.
Si la sede solo debe ser de lectura, omite el control y conserva su valor al
editar: `save()` reconstruye `data` y descartaria cualquier propiedad no incluida.

#### Quitar u ocultar una propiedad

Para **ocultar** una propiedad, elimina su fila de `cardFields` y/o del `<dl>`
del panel. El dato puede seguir existiendo en `data`; no es obligatorio mostrar
todas las propiedades. Ocultar un campo no elimina sus controles de edicion.

Para **eliminar `email` completamente** de esta demo, modifica estos puntos:

1. Quita `email` de `DemoData` y de los objetos `data` de `initialNodes()`.
2. Quita el control `email` de `form` y su asignacion en `selectNode()`.
3. Quita `email` del objeto `data` construido en `save()` y actualiza el mensaje
	 de validacion que menciona el correo.
4. Quita el `<label>` con `formControlName="email"` y la pareja `<dt>/<dd>`
	 de correo del panel en [src/app/org-chart-playground.html](src/app/org-chart-playground.html).
5. Quita su fila de `cardFields` si la habias agregado. Actualmente el correo
	 solo aparece en el panel y el formulario, no en la tarjeta.
6. Actualiza los datos y expectativas de [src/app/org-chart-demo.spec.ts](src/app/org-chart-demo.spec.ts),
	 que comprueban el correo, y cualquier adaptador o contrato de API propio.

Para sustituir todo el modelo, aplica el mismo recorrido:
**tipo de `data` -> datos/adaptador -> formulario -> carga y guardado -> tarjeta -> panel -> pruebas**.
Las funciones `addOrgNode`, `updateOrgNode` y `removeOrgNode` siguen funcionando
con tu nuevo tipo, sin cambiar su implementacion. Validan la jerarquia, no las
reglas de negocio de `data`: agrega esas validaciones en el consumidor.

Atencion: `updateOrgNode(nodes, id, { data: nuevoData })` reemplaza `data`
completo, no mezcla sus propiedades. Para cambiar solo una, conserva las demas:

```typescript
const current = this.selected();
if (current?.data) {
	this.nodes.update(nodes => updateOrgNode(nodes, current.id, {
		data: { ...current.data, department: 'Operaciones' },
	}));
}
```

Comprueba el cambio creando un nodo, seleccionandolo, editandolo y verificando
tanto la tarjeta como el panel. Ejecuta tambien `npm test -- --watch=false` y
`npm run build` para detectar campos eliminados que aun se referencian.

Para la pantalla de procesos (`/`), los puntos equivalentes son `ProcessNodeData`
y `buildProcessNodes()` en [src/app/process.model.ts](src/app/process.model.ts),
`processCardFields` en [src/app/app.ts](src/app/app.ts) y el detalle en
[src/app/org-chart-demo.html](src/app/org-chart-demo.html). No confundas esta
plantilla con la demo generica: pese al nombre, es la pantalla de procesos.

### Mostrar datos diferentes en cada tarjeta

Si. `data` puede contener tu propio modelo: departamento, correo, sede, estado,
presupuesto, listas u otros objetos. Guardar un dato no lo muestra automaticamente:
`cardFields` decide que informacion se presenta en cada nodo.

`id`, `parentId`, `name` y `role` siguen siendo obligatorios en el modelo actual.
`name` y `role` son los dos textos principales; pueden representar tambien un
equipo y su descripcion, no necesariamente una persona y su cargo.

Ejemplo para un componente situado en `src/app`:

```typescript
import { signal } from '@angular/core';
import { OrgCardField, OrgChartComponent } from './org-chart/org-chart';
import { buildOrgNodes, OrgNode } from './org-chart/org-chart.model';

interface CardData {
	department: string;
	email?: string;
	office?: string;
	active?: boolean;
	skills?: readonly string[];
}

// Dentro de tu clase de componente:
readonly nodes = signal(buildOrgNodes([
	{
		id: 'direccion', parentId: null, name: 'Ana Martinez', role: 'Directora',
		data: { department: 'Direccion', email: 'ana@example.com', active: true },
	},
	{
		id: 'tecnologia', parentId: 'direccion', name: 'Carlos Ruiz', role: 'Ingeniero',
		data: { department: 'Tecnologia', office: 'Bogota', skills: ['Angular', 'D3'] },
	},
], (record): OrgNode<CardData> => record));

readonly fields = (node: OrgNode<CardData>): readonly OrgCardField[] => {
	const data = node.data;
	const result: OrgCardField[] = [
		{ label: 'Departamento', value: data?.department },
	];
	if (data?.email) result.push({ label: 'Correo', value: data.email });
	if (data?.office) result.push({ label: 'Sede', value: data.office });
	if (data?.active !== undefined) {
		result.push({ label: 'Estado', value: data.active ? 'Activo' : 'Inactivo' });
	}
	if (data?.skills?.length) {
		result.push({ label: 'Habilidades', value: data.skills.join(', ') });
	}
	return result;
};
```

Agregar `OrgChartComponent` al arreglo `imports` del decorador de ese componente:

```html
<app-org-chart
	[nodes]="nodes()"
	[cardFields]="fields"
	[nodeWidth]="300"
	[nodeHeight]="220"
/>
```

Cada nodo puede devolver una cantidad de filas diferente, incluso `[]`.
Las mismas filas aparecen en el directorio accesible. La demo generica usa
`cardFields` para mostrar el area; la pantalla de procesos usa `processCardFields`
para distinguir procesos y participantes.

Cada campo tiene `label` y `value`. El valor admite texto, numero, booleano,
`null` o `undefined`; los dos ultimos se muestran como `-`. Formatea fechas,
monedas, listas y objetos en la funcion antes de devolverlos. Convierte los
booleanos en etiquetas como `Activo` si no quieres mostrar `true` o `false`.

Aumenta `nodeHeight` si agregas filas: el contenido no aumenta automaticamente
la altura del nodo que D3 usa para calcular la distribucion. El ancho y alto
configurados se aplican a todas las tarjetas de esa instancia.

### Cambiar el diseno completo de una tarjeta

`cardFields` personaliza datos en filas de texto. Para cambiar la estructura
visual, modifica `nodeContent()` en `src/app/org-chart/org-chart.ts`:

- `card`: contenedor, borde, fondo, espacios y alineacion.
- `avatar`: circulo con iniciales; se puede reemplazar por una imagen.
- `name` y `role`: textos principales.
- `fields`: filas adicionales configuradas desde el componente padre.

Usa `createElement` y `textContent` para datos externos; no insertes HTML
recibido desde una API. Para imagenes o enlaces, valida por separado sus URLs
y protocolos antes de asignarlos a atributos. El componente no hace esa
validacion automaticamente para elementos que agregues.

Importante: D3 inserta HTML dentro del SVG. Ese contenido NO es una plantilla
Angular: escribir `{{ dato }}`, `(click)`, `@if` o un selector Angular dentro de
`nodeContent()` no los ejecuta. Para seleccion usa `nodeSelected`; alojar
componentes Angular interactivos dentro de cada tarjeta requeriria otra
integracion y gestionar su creacion y destruccion.

### Estilos del componente y Tailwind

La pantalla de procesos usa Tailwind; el chart reutilizable y la demo generica
tienen estilos propios. Cambiar las clases de la pagina no rediseña las tarjetas.

- [src/styles.css](src/styles.css): fuente mediante `@theme`, estilos base y clases compartidas `chart-tool` / `form-field` de la pantalla de procesos.
- [src/app/org-chart-demo.html](src/app/org-chart-demo.html): distribucion y clases Tailwind de la pantalla de procesos.
- [src/app/org-chart/org-chart.css](src/app/org-chart/org-chart.css): fondo punteado, barra de herramientas, directorio y estados del chart.
- [src/app/org-chart/org-chart.ts](src/app/org-chart/org-chart.ts): `nodeContent()` usa estilos inline para las tarjetas, iniciales, bordes y textos, no clases Tailwind.
- [src/app/org-chart-playground.css](src/app/org-chart-playground.css): layout, formularios y panel lateral de la demo generica.

El HTML de las tarjetas lo inserta D3, no Angular. No recibe automaticamente los
atributos de encapsulacion de estilos de Angular: agregar reglas en el CSS del
consumidor o del componente puede no afectar a ese HTML. En la implementacion
actual, cambia los estilos inline de `nodeContent()` para rediseñar la tarjeta;
no necesitas `::ng-deep`. Tampoco hay una entrada de plantilla personalizada
por instancia: `cardFields` solo configura filas de texto.

Si modificas las clases Tailwind de la pantalla de procesos, mantenlas completas
y literales; no construyas nombres como `bg-${color}-100`.
El directorio ofrece una alternativa accesible al grafico y permite seleccionar
personas con teclado. D3 se importa despues del renderizado del navegador,
se actualiza mediante signals y se limpia al destruir el componente.

```bash
npm test -- --watch=false
npm run build
```

### Error: app-org-chart is not a known element

`app-org-chart` es un componente Angular, no un Web Component. El componente
que usa su selector debe importar su clase en el archivo TypeScript y tambien
registrarla en el arreglo `imports` de `@Component`:

```typescript
import { Component } from '@angular/core';
import { OrgChartComponent } from './org-chart/org-chart';

@Component({
	selector: 'app-root',
	imports: [OrgChartComponent],
	templateUrl: './org-chart-demo.html',
})
export class App {
	// Declarar aqui los nodos y las propiedades utilizadas por la plantilla.
}
```

La ruta del import debe ser relativa al componente consumidor. En Angular 21
los componentes son standalone por defecto. Si usas el grafico desde otro
componente, debes registrarlo tambien en los `imports` de ese consumidor.

En esta aplicacion `App` ya tiene ambos imports y la compilacion de produccion
y las pruebas pasan. El diagnostico del editor no se reprodujo en el compilador
de Angular; no se ha verificado aun que desaparezca al reiniciar el editor.

Si el error permanece solo en VS Code:

1. Guarda los cambios y abre la paleta de comandos con `Ctrl+Shift+P`.
2. Ejecuta `Angular: Restart Angular Language Server`.
3. Si no aparece ese comando o el aviso persiste, ejecuta `Developer: Reload Window`.
4. Si continua, revisa `Output > Angular Language Service` y confirma que la extension esta usando este workspace y su version local de Angular. El enlace a documentacion v22 del aviso no determina la version del proyecto, que usa Angular 21.
5. Ejecuta `npm run build`: si tambien falla, revisa el import, la ruta y el selector indicados por el compilador antes de atribuirlo al editor.

No agregues `CUSTOM_ELEMENTS_SCHEMA` ni `NO_ERRORS_SCHEMA`: ocultarian el
diagnostico sin registrar el componente, y perderias comprobaciones utiles.

## Ruta tecnica: libreria de tarjetas tipadas para organigrama

Esta ruta describe como evolucionar el POC hacia una libreria reutilizable para
mostrar tarjetas con distintos tipos de datos, por ejemplo:

- `Proceso`: tiene `titulo` y `subtitulo`.
- Cada `Proceso` tiene personas asignadas con distintos cargos.

Objetivo: separar dominio, adaptadores y presentacion para que puedas conectar
distintas APIs sin reescribir el componente visual.

### 1) Estructura recomendada de la libreria

Dentro de `src/app/org-chart/` (o en una libreria de `projects/` si luego la
separas), usar una estructura por responsabilidades:

```text
org-chart/
  model/
    org-node.model.ts
    process.model.ts
    person.model.ts
    role.model.ts
  adapters/
    process-to-org-node.adapter.ts
    employee-to-org-node.adapter.ts
  rendering/
    card-field.model.ts
    card-renderer.types.ts
    default-card-renderer.ts
  state/
    org-chart.store.ts
  utils/
    validation.ts
    hierarchy.ts
  org-chart.ts
  org-chart.html
  public-api.ts
```

Regla clave: el componente `org-chart.ts` no debe conocer detalles de una API
especifica. Solo recibe nodos en el contrato generico.

### 2) Modelo de dominio (tipado fuerte)

Definir tipos de negocio primero:

```typescript
export interface Role {
	id: string;
	name: string;
	level?: number;
}

export interface Person {
	id: string;
	fullName: string;
	role: Role;
	email?: string;
	location?: string;
}

export interface Process {
	id: string;
	titulo: string;
	subtitulo: string;
	responsables: readonly Person[];
	childProcessIds?: readonly string[];
}
```

Esto evita acoplar la UI con nombres de campos de una sola fuente de datos.

### 3) Contrato visual unico (`OrgNode<TData>`)

El grafico sigue consumiendo un contrato unico. `TData` transporta el modelo
real (`Process`, `Person`, etc.).

```typescript
export interface OrgNode<TData = unknown> {
	id: string;
	parentId: string | null;
	name: string;
	role: string;
	data?: TData;
}
```

Convencion sugerida:

- Para `Proceso`: `name = titulo`, `role = subtitulo`.
- `data` guarda el objeto completo para detalles avanzados.

### 4) Adaptadores por fuente de datos

Crear una funcion adaptadora por tipo de entrada. Ejemplo para `Process`:

```typescript
export function mapProcessToOrgNode(
	process: Process,
	parentId: string | null,
): OrgNode<Process> {
	return {
		id: process.id,
		parentId,
		name: process.titulo,
		role: process.subtitulo,
		data: process,
	};
}
```

Si la API cambia, ajustas solo el adaptador, no el componente.

### 5) Tarjetas con tipos de datos diferentes

Resolver con `cardFields` por nodo, no con plantillas acopladas. El contrato
de fila ya existe (`label`, `value`). Extiende con formato opcional:

```typescript
export interface OrgCardField {
	label: string;
	value: string | number | boolean | null | undefined;
	highlight?: boolean;
}
```

Ejemplo para `Process`:

```typescript
readonly processFields = (node: OrgNode<Process>): readonly OrgCardField[] => {
	const p = node.data;
	if (!p) return [];

	return [
		{ label: 'Titulo', value: p.titulo, highlight: true },
		{ label: 'Subtitulo', value: p.subtitulo },
		{ label: 'Responsables', value: p.responsables.length },
		{
			label: 'Cargos',
			value: [...new Set(p.responsables.map(x => x.role.name))].join(', '),
		},
	];
};
```

Con este enfoque cada nodo puede representar:

- proceso,
- persona,
- area,
- indicador,

sin cambiar la API del componente.

### 6) Variantes de tarjeta (template strategy)

Cuando necesites layouts realmente distintos, agregar estrategia de render:

```typescript
export type CardKind = 'process' | 'person' | 'team';

export interface CardRenderContext<T> {
	node: OrgNode<T>;
	fields: readonly OrgCardField[];
	kind: CardKind;
}
```

Luego `nodeContent()` decide clases y distribucion segun `kind`.

### 7) Estado y flujo de datos

Flujo recomendado:

1. Servicio HTTP obtiene procesos/personas.
2. Adaptador convierte al contrato `OrgNode<T>`.
3. `signal` de estado mantiene la lista.
4. Componente renderiza y emite `nodeSelected`.
5. Contenedor abre panel de detalle con `node.data` tipado.

Evitar mutar arreglos in-place; siempre reemplazar referencias (`set`/`update`).

### 8) Validaciones tecnicas obligatorias

Antes de renderizar:

- un solo nodo raiz,
- IDs unicos,
- `parentId` existente (excepto raiz),
- sin ciclos,
- `name` y `role` no vacios.

Estas reglas deben vivir en utilidades puras y con pruebas unitarias.

### 9) Accesibilidad y seguridad

- Mantener vista alternativa en lista para teclado/lectores de pantalla.
- Nunca interpolar HTML remoto en `nodeContent()`.
- Usar `textContent` para texto externo.
- Si agregas links/imagenes, validar protocolo y dominio permitido.

### 10) Testing minimo para hacerla mantenible

Cobertura recomendada:

- Adaptadores: mapean correctamente cada tipo de API.
- Validacion jerarquica: raiz, ciclos, padres faltantes, IDs duplicados.
- `cardFields`: formatea valores complejos y nulos.
- Componente: render basico, `nodeSelected`, cambios de inputs.

Comandos:

```bash
npm test -- --watch=false
npm run build
```

### 11) Si decides publicarla como libreria Angular

Pasos:

1. Crear proyecto de libreria (`ng generate library org-chart-lib`).
2. Mover `model`, `adapters`, `rendering`, `utils` y componente.
3. Definir `public-api.ts` con exports estables.
4. Mantener versionado semantico (breaking changes solo en major).
5. Documentar ejemplos por caso: `Process`, `Employee`, `Team`.

### 12) Checklist de implementacion por fases

1. Fase A: consolidar modelos (`Process`, `Person`, `Role`) y adaptadores.
2. Fase B: estandarizar `cardFields` para tipos mixtos.
3. Fase C: introducir `CardKind` para layouts diferentes.
4. Fase D: reforzar validaciones y pruebas.
5. Fase E: extraer a libreria y publicar.

Con esta ruta puedes soportar tarjetas heterogeneas sin romper el contrato del
grafico y mantener una base extensible para nuevos tipos de datos.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
