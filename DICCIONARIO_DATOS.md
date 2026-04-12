# DICCIONARIO DE DATOS — AccessTime 3.0

## Índice
1. <a>Tabla 1 - usuarios_sistema</a>
2. <a>Tabla 2 - empleados</a>
3. <a>Tabla 3 - biometricos_faciales</a>
4. <a>Tabla 4 - personal_transporte</a>
5. <a>Tabla 5 - empresas_proveedoras</a>
6. <a>Tabla 6 - personal_proveedores</a>
7. <a>Tabla 7 - registros_acceso</a>
8. <a>Tabla 8 - pases_temporales</a>

---

## Leyenda
- **M** = Obligatorio (Mandatory)
- **O** = Opcional
- **AN** = Alfanumérico
- **N** = Numérico
- **PK** = Clave Primaria
- **FK** = Clave Foránea
- **AI** = Auto-incremental

---

## TABLA 1: `usuarios_sistema` — Usuarios del Sistema

**Descripción:** Usuarios administrativos del sistema (supervisores y personal de seguridad).

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `usuario.id` |
| usuario | Nombre de usuario | M | AN | 50 | Único, usado para login | `usuario.usuario` |
| contrasena | Contraseña | M | AN | 255 | Almacenada encriptada | `usuario.contrasena` |
| nombre_completo | Nombre completo | M | AN | 255 | Nombre y apellidos del usuario | `usuario.nombre_completo` |
| rol | Rol del usuario | M | AN | 50 | ADMINISTRADOR / SUPERVISOR / SEGURIDAD | `usuario.rol` |
| email | Correo electrónico | O | AN | 255 | Formato: usuario@dominio.com | `usuario.email` |
| estado | Estado del usuario | M | AN | 50 | "Activo" / "Inactivo". Default: "Activo" | `usuario.estado` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `usuario.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `usuario.actualizado_en` |

---

## TABLA 2: `empleados` — Empleados

**Descripción:** Empleados de la organización con sus credenciales y datos laborales.

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `empleado.id` |
| nombre_completo | Nombre completo | M | AN | 255 | Nombre y apellidos del empleado | `empleado.nombre_completo` |
| dni | DNI | M | AN | 20 | Único. Documento Nacional de Identidad | `empleado.dni` |
| rol | Rol del personal | M | AN | 50 | Default: "EMPLEADO" | `empleado.rol` |
| cargo | Cargo | O | AN | 100 | Ej: Asistente, Operario | `empleado.cargo` |
| departamento | Departamento | M | AN | 100 | Área de trabajo | `empleado.departamento` |
| sede | Sede de trabajo | O | AN | 50 | Ej: Lima, VES, SJL | `empleado.sede` |
| vencimiento_contrato | Vencimiento de contrato | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `empleado.vencimiento_contrato` |
| email | Correo electrónico | O | AN | 255 | Formato: usuario@dominio.com | `empleado.email` |
| ruta_foto | Ruta de foto | O | AN | 500 | Ruta relativa al directorio del servidor | `empleado.ruta_foto` |
| estado | Estado del empleado | M | AN | 50 | "Activo" / "Inactivo". Default: "Activo" | `empleado.estado` |
| tiene_biometrico | Tiene biométrico | M | N | - | true / false. Default: false | `empleado.tiene_biometrico` |
| hora_entrada | Hora de entrada | O | AN | 5 | HH:mm (24h). Default: "08:00" | `empleado.hora_entrada` |
| hora_salida | Hora de salida | O | AN | 5 | HH:mm (24h). Default: "17:45" | `empleado.hora_salida` |
| fecha_hora_entrada | Última entrada registrada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `empleado.fecha_hora_entrada` |
| fecha_hora_salida | Última salida registrada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `empleado.fecha_hora_salida` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `empleado.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `empleado.actualizado_en` |

---

## TABLA 3: `biometricos_faciales` — Datos Biométricos Faciales

**Descripción:** Datos biométricos faciales para autenticación por reconocimiento facial.

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `biometrico.id` |
| empleado_id | ID del empleado | O | N | - | FK → empleados.id. Solo uno de los 3 FK tiene valor | `biometrico.empleado_id` |
| personal_transporte_id | ID personal transporte | O | N | - | FK → personal_transporte.id | `biometrico.personal_transporte_id` |
| personal_proveedor_id | ID personal proveedor | O | N | - | FK → personal_proveedores.id | `biometrico.personal_proveedor_id` |
| descriptor | Descriptor facial | M | AN | TEXT | JSON array de 128 valores Float32 | `biometrico.descriptor` |
| activo | Estado del registro | M | N | - | true / false. Default: true | `biometrico.activo` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `biometrico.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `biometrico.actualizado_en` |

---

## TABLA 4: `personal_transporte` — Personal de Transporte

**Descripción:** Personal de transporte externo (choferes, transportistas).

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `transporte.id` |
| nombre_completo | Nombre completo | M | AN | 255 | Nombre y apellidos | `transporte.nombre_completo` |
| dni | DNI | M | AN | 20 | Único. Documento Nacional de Identidad | `transporte.dni` |
| empresa | Empresa | M | AN | 255 | Empresa transportista a la que pertenece | `transporte.empresa` |
| vehiculo | Tipo de vehículo | O | AN | 100 | Descripción del vehículo | `transporte.vehiculo` |
| matricula | Placa del vehículo | O | AN | 20 | Número de placa | `transporte.matricula` |
| ruta_foto | Ruta de foto | O | AN | 500 | Ruta relativa al directorio del servidor | `transporte.ruta_foto` |
| estado | Estado | M | AN | 50 | "Activo" / "Inactivo". Default: "Activo" | `transporte.estado` |
| hora_entrada | Hora de entrada | O | AN | 5 | HH:mm. Default: "08:00" | `transporte.hora_entrada` |
| hora_salida | Hora de salida | O | AN | 5 | HH:mm. Default: "17:45" | `transporte.hora_salida` |
| fecha_hora_entrada_programada | Entrada programada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.fecha_hora_entrada_programada` |
| fecha_hora_salida_programada | Salida programada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.fecha_hora_salida_programada` |
| fecha_hora_entrada_real | Entrada real | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.fecha_hora_entrada_real` |
| fecha_hora_salida_real | Salida real | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.fecha_hora_salida_real` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `transporte.actualizado_en` |

---

## TABLA 5: `empresas_proveedoras` — Empresas Proveedoras

**Descripción:** Empresas proveedoras de servicios o suministros.

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `empresa.id` |
| nombre_empresa | Nombre de la empresa | M | AN | 255 | Único en el sistema | `empresa.nombre_empresa` |
| ruc | RUC | O | AN | 50 | Registro Único de Contribuyentes | `empresa.ruc` |
| tipo_suministro | Tipo de suministro | O | AN | 100 | Tipo de servicio o producto que provee | `empresa.tipo_suministro` |
| contacto_comercial | Contacto comercial | O | AN | 255 | Nombre del representante | `empresa.contacto_comercial` |
| telefono | Teléfono | O | AN | 50 | Número de contacto | `empresa.telefono` |
| direccion | Dirección | O | AN | 500 | Dirección física de la empresa | `empresa.direccion` |
| estado | Estado | M | AN | 50 | "Activo" / "Inactivo". Default: "Activo" | `empresa.estado` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `empresa.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `empresa.actualizado_en` |

---

## TABLA 6: `personal_proveedores` — Personal de Proveedores

**Descripción:** Personal de empresas proveedoras que requiere acceso a las instalaciones.

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `proveedor.id` |
| nombre_completo | Nombre completo | M | AN | 255 | Nombre y apellidos | `proveedor.nombre_completo` |
| dni | DNI | M | AN | 20 | Único. Documento Nacional de Identidad | `proveedor.dni` |
| empresa | Empresa | M | AN | 255 | Empresa proveedora a la que pertenece | `proveedor.empresa` |
| cargo | Cargo | O | AN | 100 | Cargo en la empresa | `proveedor.cargo` |
| telefono | Teléfono | O | AN | 50 | Número de contacto | `proveedor.telefono` |
| ruta_foto | Ruta de foto | O | AN | 500 | Ruta relativa al directorio del servidor | `proveedor.ruta_foto` |
| estado | Estado | M | AN | 50 | "Activo" / "Inactivo". Default: "Activo" | `proveedor.estado` |
| hora_entrada | Hora de entrada | O | AN | 5 | HH:mm. Default: "08:00" | `proveedor.hora_entrada` |
| hora_salida | Hora de salida | O | AN | 5 | HH:mm. Default: "17:45" | `proveedor.hora_salida` |
| fecha_hora_entrada_programada | Entrada programada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.fecha_hora_entrada_programada` |
| fecha_hora_salida_programada | Salida programada | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.fecha_hora_salida_programada` |
| fecha_hora_entrada_real | Entrada real | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.fecha_hora_entrada_real` |
| fecha_hora_salida_real | Salida real | O | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.fecha_hora_salida_real` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.creado_en` |
| actualizado_en | Fecha de actualización | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `proveedor.actualizado_en` |

---

## TABLA 7: `registros_acceso` — Registros de Acceso

**Descripción:** Registro histórico de todos los accesos al sistema (entradas y salidas).

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `acceso.id` |
| nombre_usuario | Nombre del usuario | M | AN | 255 | Nombre de quien accedió | `acceso.nombre_usuario` |
| dni_usuario | DNI del usuario | O | AN | 20 | Documento del usuario | `acceso.dni_usuario` |
| rol | Rol del usuario | M | AN | 100 | Tipo de personal | `acceso.rol` |
| estado | Estado del acceso | M | AN | 50 | Aprobado / Denegado / Fuera de Horario | `acceso.estado` |
| zona | Zona de acceso | M | AN | 100 | Zona a la que se accedió | `acceso.zona` |
| tipo | Tipo de alerta | M | AN | 50 | success / warning / critical | `acceso.tipo` |
| hora_entrada | Fecha y hora de entrada | M | AN | 19 | YYYY-MM-DD HH:mm:ss. Default: NOW() | `acceso.hora_entrada` |
| hora_salida | Fecha y hora de salida | O | AN | 19 | YYYY-MM-DD HH:mm:ss. NULL hasta que salga | `acceso.hora_salida` |
| empleado_id | ID del empleado | O | N | - | FK → empleados.id | `acceso.empleado_id` |
| transporte_id | ID personal transporte | O | N | - | FK → personal_transporte.id | `acceso.transporte_id` |
| proveedor_id | ID personal proveedor | O | N | - | FK → personal_proveedores.id | `acceso.proveedor_id` |

---

## TABLA 8: `pases_temporales` — Pases Temporales

**Descripción:** Pases temporales para visitantes o personal con acceso limitado en el tiempo.

| CAMPO | NOMBRE | OBLIGATORIEDAD | TIPO | LONGITUD | FORMATO / OBSERVACIONES | CAMPO API / JSON |
|-------|--------|:--------------:|------|:--------:|-------------------------|-----------------|
| id | Identificador único | M | N | - | Auto-incremental, PK | `pase.id` |
| nombre_completo | Nombre del visitante | M | AN | 255 | Nombre completo del visitante | `pase.nombre_completo` |
| dni | DNI del visitante | M | AN | 20 | Documento Nacional de Identidad | `pase.dni` |
| empresa | Empresa del visitante | O | AN | 255 | Empresa a la que pertenece | `pase.empresa` |
| motivo | Motivo de visita | M | AN | TEXT | Descripción del motivo de la visita | `pase.motivo` |
| autorizado_por | Autorizado por | M | AN | 255 | Nombre del supervisor que autorizó | `pase.autorizado_por` |
| emitido_por_id | ID del emisor | O | N | - | FK → empleados.id (quien emitió el pase) | `pase.emitido_por_id` |
| valido_desde | Válido desde | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `pase.valido_desde` |
| valido_hasta | Válido hasta | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `pase.valido_hasta` |
| estado | Estado del pase | M | AN | 50 | Activo / Expirado / Cancelado. Default: "Activo" | `pase.estado` |
| creado_en | Fecha de creación | M | AN | 19 | YYYY-MM-DD HH:mm:ss | `pase.creado_en` |

---

## Diagrama de Relaciones

```
┌─────────────────────┐
│  usuarios_sistema   │
│  (SystemUser)       │
└─────────────────────┘

┌─────────────────────┐      1:1        ┌──────────────────────┐
│    empleados        │◄────────────────┤ biometricos_faciales │
│   (Employee)        │                 │   (FaceBiometric)    │
└──────────┬──────────┘                 └───────────┬──────────┘
           │ 1:N                                    │
           ├────────────────────────┐               │
     1:N   ▼                  1:N   ▼               │
┌─────────────────────┐    ┌─────────────────────┐  │
│  registros_acceso   │    │  pases_temporales   │  │
│   (AccessLog)       │    │  (TemporaryPass)    │  │
└──────────┬──────────┘    └─────────────────────┘  │
           │ N:1                                     │ 1:1
           │            ┌────────────────────┐       │
           └────────────┤ personal_transporte│◄──────┤
                        │ (TransportPersonnel)│       │
                        └────────────────────┘       │
                                                     │ 1:1
                        ┌────────────────────┐       │
                        │personal_proveedores│◄──────┘
                        │ (ProviderPersonnel)│
                        └────────────────────┘

┌────────────────────────┐
│  empresas_proveedoras  │
│  (ProviderCompany)     │
└────────────────────────┘
```

---

## Notas Importantes

### Reglas de Negocio
1. **Datos Biométricos:** Un registro biométrico solo puede estar asociado a UNA persona.
2. **Registros de Acceso:** Un registro solo puede estar vinculado a UNA fuente (empleado, transporte o proveedor).
3. **Horarios:** Se almacenan en formato HH:mm (24 horas).
4. **Estados:** Los estados válidos son "Activo" e "Inactivo" para la mayoría de entidades.
5. **Pases Temporales:** Deben validarse contra las fechas `valido_desde` y `valido_hasta`.

### Seguridad
- Las contraseñas se almacenan encriptadas en el campo `contrasena`.
- Los descriptores biométricos se almacenan como JSON en formato TEXT.
- Las rutas de fotos son rutas relativas al directorio de almacenamiento del sistema.

### Integridad Referencial
- **CASCADE:** Al eliminar un empleado/personal, se eliminan sus datos biométricos.
- **SET NULL:** Al eliminar un empleado/personal, sus registros de acceso y pases temporales conservan el historial con referencia NULL.

---

**Última actualización:** 12 de abril de 2026
**Versión del esquema:** 2.0
**Generado desde:** `prisma/schema.prisma`
