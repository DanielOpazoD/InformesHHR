# Registro Clínico – Hospital Hanga Roa

Aplicación web liviana para gestionar y documentar la evolución clínica de pacientes del Hospital Hanga Roa. Permite editar secciones del informe, agregar campos personalizados, exportar/importar registros en formato JSON y generar versiones imprimibles o en PDF.

## Características principales

- **Edición guiada**: modo de edición que habilita la eliminación y creación de secciones y campos del paciente.
- **Plantillas dinámicas**: selector de tipo de informe con títulos autogenerados y estructuras preconfiguradas.
- **Importación / exportación**: persistencia del formulario completo en JSON con nombres de archivo sugeridos.
- **Impresión profesional**: título y nombre del archivo ajustados automáticamente antes de imprimir o guardar en PDF.

## Estructura del proyecto

```
.
├── assets/
│   ├── css/
│   │   └── main.css          # Estilos base compartidos
│   └── js/
│       ├── controllers/      # Lógica de interacción y orquestación
│       ├── models/           # Datos por defecto y reglas de negocio
│       └── utils/            # Utilidades puras y reutilizables
├── index.html                # Estructura del documento y dependencias
└── README.md                 # Este documento
```

### Controladores (`assets/js/controllers`)
Cada controlador encapsula una responsabilidad concreta:

- `patientController.js`: renderiza y gestiona los campos del paciente, manteniendo el cálculo automático de edad.
- `sectionController.js`: administra la creación, eliminación y restauración de secciones clínicas.
- `titleController.js`: sincroniza el título del informe con la plantilla seleccionada y la fecha de referencia.
- `editController.js`: gobierna el modo de edición y sus reglas de activación/cierre.
- `fileController.js`: orquesta la exportación/importación robusta de archivos JSON, incluyendo validaciones de errores.
- `printController.js`: prepara nombres de archivo limpios y restablece el título tras la impresión.
- `main.js`: punto de entrada que inicializa los controladores, define funciones de integración y maneja los flujos de datos.

### Modelos y utilidades
- `models/defaults.js`: define plantillas predeterminadas para campos del paciente y secciones clínicas.
- `models/templates.js`: centraliza la construcción de títulos y nombres base por tipo de informe.
- `utils/dateUtils.js`: helpers para formatos de fecha, cálculo de edad y validaciones ISO.
- `utils/stringUtils.js`: sanitización de cadenas (acentos y caracteres no permitidos).

## Principios de modularización

1. **Responsabilidad única**: cada módulo expone funciones enfocadas en una tarea. Evitar funciones multipropósito reduce el acoplamiento y facilita pruebas unitarias futuras.
2. **Separación entre lógica y presentación**: el HTML se limita a la estructura; la lógica se orquesta desde `main.js` a través de controladores reutilizables.
3. **Datos inmutables por defecto**: las plantillas y configuraciones se exponen como estructuras `Object.freeze` para prevenir mutaciones accidentales.
4. **Utilidades puras**: las funciones de `utils/` no dependen del DOM y pueden migrarse a otros contextos (tests, backend) sin cambios.
5. **Interfaces explícitas**: los controladores reciben dependencias (elementos DOM, funciones de acceso a datos) mediante parámetros, lo que facilita la sustitución o extensión.

## Directrices de actualización

- **Nuevos campos o secciones**: declare los valores iniciales en `models/defaults.js` y reutilice `renderPatientFields`/`renderSections` para mantener los controles de borrado.
- **Nuevas plantillas**: amplíe `models/templates.js` (título y nombre base) y, si requiere estructura propia, actualice `getTemplateSections` en `models/defaults.js`.
- **Validaciones adicionales**: ubíquelas en controladores específicos o cree nuevos helpers en `utils/` para mantener la consistencia.
- **Persistencia**: mantenga la compatibilidad del esquema JSON agregando un campo `version` (actualmente `v12`). Documente cualquier cambio en el README.
- **Estilo de código**: utilice ES Modules, funciones puras cuando sea posible y evite dependencias globales. Prefiera `const` para referencias inmutables.
- **Pruebas manuales**: verifique siempre los flujos de exportación, importación y actualización de títulos tras tocar módulos relacionados.

## Controles internos y aseguramiento de calidad

- Manejo de errores en importación/exportación con mensajes al usuario y registros en consola.
- Salvaguardas en la inicialización (verificación de elementos críticos) para evitar fallos silenciosos.
- Normalización de entradas al crear campos y secciones, asegurando que los botones de eliminación siempre estén disponibles.
- Funciones puras reutilizables para cálculos sensibles (edad, formateo de fechas) con expresiones regulares para validar formatos.

## Próximos pasos sugeridos

- Automatizar pruebas E2E con Playwright o Cypress para los flujos principales.
- Implementar almacenamiento local (localStorage) como caché de la última versión del formulario.
- Añadir un pipeline de linting (ESLint + Prettier) para reforzar la consistencia del código.

---

Para dudas, sugerencias o mejoras, documente los cambios siguiendo la estructura modular descrita y actualice este README cuando se añadan funcionalidades relevantes.
