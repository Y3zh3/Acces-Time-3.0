# Diccionario de Datos - AccessTime Sistema Biométrico

## Índice

1. [Enumeraciones](#enumeraciones)
2. [Tablas del Sistema](#tablas-del-sistema)
3. [Diagrama de Relaciones](#diagrama-de-relaciones)

---

## Enumeraciones

### UserRole

Roles disponibles en el sistema para usuarios administrativos.

| Valor         | Descripción                    |
| ------------- | ------------------------------ |
| ADMINISTRADOR | Acceso completo al sistema     |
| SUPERVISOR    | Gestión de personal y reportes |
| SEGURIDAD     | Control de accesos             |

---

## Tablas del Sistema

### 1. usuarios_sistema (SystemUser)

**Descripción:** Usuarios administrativos del sistema (supervisores y personal de seguridad).

**Nombre en Base de Datos:** `usuarios_sistema`

| Campo           | Tipo         | Nulo | Clave  | Default  | Descripción                          |
| --------------- | ------------ | ---- | ------ | -------- | ------------------------------------ |
| id              | INT          | NO   | PK, AI | -        | Identificador único del usuario      |
| usuario         | VARCHAR(50)  | NO   | UNIQUE | -        | Nombre de usuario para login         |
| contrasena      | VARCHAR(255) | NO   | -      | -        | Contraseña encriptada                |
| nombre_completo | VARCHAR(255) | NO   | -      | -        | Nombre completo del usuario          |
| rol             | VARCHAR(50)  | NO   | -      | -        | Rol del usuario en el sistema        |
| email           | VARCHAR(255) | SÍ   | -      | NULL     | Correo electrónico                   |
| estado          | VARCHAR(50)  | NO   | -      | "Activo" | Estado del usuario (Activo/Inactivo) |
| creado_en       | DATETIME     | NO   | -      | NOW()    | Fecha y hora de creación             |
| actualizado_en  | DATETIME     | NO   | -      | NOW()    | Fecha y hora de última actualización |

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (usuario)

---

### 2. empleados (Employee)

**Descripción:** Empleados de la organización con sus credenciales y datos laborales.

**Nombre en Base de Datos:** `empleados`

| Campo                | Tipo         | Nulo | Clave       | Default    | Descripción                                  |
| -------------------- | ------------ | ---- | ----------- | ---------- | -------------------------------------------- |
| id                   | INT          | NO   | PK, AI      | -          | Identificador único del empleado             |
| nombre_completo      | VARCHAR(255) | NO   | -           | -          | Nombre completo del empleado                 |
| dni                  | VARCHAR(20)  | NO   | UNIQUE, IDX | -          | Documento Nacional de Identidad              |
| rol                  | VARCHAR(50)  | NO   | -           | "EMPLEADO" | Tipo de personal (EMPLEADO, etc.)            |
| cargo                | VARCHAR(100) | SÍ   | -           | NULL       | Cargo específico (Asistente, Operario, etc.) |
| departamento         | VARCHAR(100) | NO   | -           | -          | Departamento al que pertenece                |
| sede                 | VARCHAR(50)  | SÍ   | -           | NULL       | Sede de trabajo (Lima, Ves, SJL)             |
| vencimiento_contrato | DATETIME     | SÍ   | -           | NULL       | Fecha de vencimiento del contrato            |
| email                | VARCHAR(255) | SÍ   | -           | NULL       | Correo electrónico                           |
| ruta_foto            | VARCHAR(500) | SÍ   | -           | NULL       | Ruta de la foto del empleado                 |
| estado               | VARCHAR(50)  | NO   | IDX         | "Activo"   | Estado del empleado (Activo/Inactivo)        |
| tiene_biometrico     | BOOLEAN      | NO   | -           | false      | Indica si tiene registro biométrico          |
| hora_entrada         | VARCHAR(5)   | SÍ   | -           | "08:00"    | Hora de inicio laboral (formato HH:mm)       |
| hora_salida          | VARCHAR(5)   | SÍ   | -           | "17:45"    | Hora de fin laboral (formato HH:mm)          |
| fecha_hora_entrada   | DATETIME     | SÍ   | -           | NULL       | Última entrada registrada                    |
| fecha_hora_salida    | DATETIME     | SÍ   | -           | NULL       | Última salida registrada                     |
| creado_en            | DATETIME     | NO   | -           | NOW()      | Fecha y hora de creación                     |
| actualizado_en       | DATETIME     | NO   | -           | NOW()      | Fecha y hora de última actualización         |

**Relaciones:**

- Uno a Uno con `biometricos_faciales` (FaceBiometric)
- Uno a Muchos con `registros_acceso` (AccessLog)
- Uno a Muchos con `pases_temporales` (TemporaryPass - emisor)

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (dni)
- INDEX (dni)
- INDEX (estado)

---

### 3. biometricos_faciales (FaceBiometric)

**Descripción:** Datos biométricos faciales para autenticación por reconocimiento facial.

**Nombre en Base de Datos:** `biometricos_faciales`

| Campo                  | Tipo     | Nulo | Clave      | Default | Descripción                                   |
| ---------------------- | -------- | ---- | ---------- | ------- | --------------------------------------------- |
| id                     | INT      | NO   | PK, AI     | -       | Identificador único del registro biométrico   |
| empleado_id            | INT      | SÍ   | UNIQUE, FK | NULL    | ID del empleado asociado                      |
| personal_transporte_id | INT      | SÍ   | UNIQUE, FK | NULL    | ID del personal de transporte asociado        |
| personal_proveedor_id  | INT      | SÍ   | UNIQUE, FK | NULL    | ID del personal de proveedor asociado         |
| descriptor             | TEXT     | NO   | -          | -       | Descriptor facial (JSON array de 128 valores) |
| activo                 | BOOLEAN  | NO   | IDX        | true    | Indica si el registro está activo             |
| creado_en              | DATETIME | NO   | -          | NOW()   | Fecha y hora de creación                      |
| actualizado_en         | DATETIME | NO   | -          | NOW()   | Fecha y hora de última actualización          |

**Relaciones:**

- Uno a Uno con `empleados` (Employee) - ON DELETE CASCADE
- Uno a Uno con `personal_transporte` (TransportPersonnel) - ON DELETE CASCADE
- Uno a Uno con `personal_proveedores` (ProviderPersonnel) - ON DELETE CASCADE

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (empleado_id)
- UNIQUE (personal_transporte_id)
- UNIQUE (personal_proveedor_id)
- INDEX (activo)

**Nota:** Solo uno de los campos FK (empleado_id, personal_transporte_id, personal_proveedor_id) debe tener valor.

---

### 4. personal_transporte (TransportPersonnel)

**Descripción:** Personal de transporte externo (choferes, transportistas).

**Nombre en Base de Datos:** `personal_transporte`

| Campo                         | Tipo         | Nulo | Clave       | Default  | Descripción                          |
| ----------------------------- | ------------ | ---- | ----------- | -------- | ------------------------------------ |
| id                            | INT          | NO   | PK, AI      | -        | Identificador único                  |
| nombre_completo               | VARCHAR(255) | NO   | -           | -        | Nombre completo del personal         |
| dni                           | VARCHAR(20)  | NO   | UNIQUE, IDX | -        | Documento Nacional de Identidad      |
| empresa                       | VARCHAR(255) | NO   | -           | -        | Empresa a la que pertenece           |
| vehiculo                      | VARCHAR(100) | SÍ   | -           | NULL     | Tipo de vehículo                     |
| matricula                     | VARCHAR(20)  | SÍ   | -           | NULL     | Placa del vehículo                   |
| ruta_foto                     | VARCHAR(500) | SÍ   | -           | NULL     | Ruta de la foto                      |
| estado                        | VARCHAR(50)  | NO   | -           | "Activo" | Estado (Activo/Inactivo)             |
| hora_entrada                  | VARCHAR(5)   | SÍ   | -           | "08:00"  | Hora de inicio laboral (HH:mm)       |
| hora_salida                   | VARCHAR(5)   | SÍ   | -           | "17:45"  | Hora de fin laboral (HH:mm)          |
| fecha_hora_entrada_programada | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de entrada programada   |
| fecha_hora_salida_programada  | DATETIME     | SÍ   | IDX         | NULL     | Fecha y hora de salida programada    |
| fecha_hora_entrada_real       | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de entrada real         |
| fecha_hora_salida_real        | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de salida real          |
| creado_en                     | DATETIME     | NO   | -           | NOW()    | Fecha y hora de creación             |
| actualizado_en                | DATETIME     | NO   | -           | NOW()    | Fecha y hora de última actualización |

**Relaciones:**

- Uno a Uno con `biometricos_faciales` (FaceBiometric)
- Uno a Muchos con `registros_acceso` (AccessLog)

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (dni)
- INDEX (dni)
- INDEX (fecha_hora_salida_programada)

---

### 5. empresas_proveedoras (ProviderCompany)

**Descripción:** Empresas proveedoras de servicios o suministros.

**Nombre en Base de Datos:** `empresas_proveedoras`

| Campo              | Tipo         | Nulo | Clave       | Default  | Descripción                          |
| ------------------ | ------------ | ---- | ----------- | -------- | ------------------------------------ |
| id                 | INT          | NO   | PK, AI      | -        | Identificador único de la empresa    |
| nombre_empresa     | VARCHAR(255) | NO   | UNIQUE, IDX | -        | Nombre de la empresa proveedora      |
| ruc                | VARCHAR(50)  | SÍ   | -           | NULL     | RUC de la empresa                    |
| tipo_suministro    | VARCHAR(100) | SÍ   | -           | NULL     | Tipo de suministro que provee        |
| contacto_comercial | VARCHAR(255) | SÍ   | -           | NULL     | Nombre del contacto comercial        |
| telefono           | VARCHAR(50)  | SÍ   | -           | NULL     | Teléfono de contacto                 |
| direccion          | VARCHAR(500) | SÍ   | -           | NULL     | Dirección de la empresa              |
| estado             | VARCHAR(50)  | NO   | -           | "Activo" | Estado (Activo/Inactivo)             |
| creado_en          | DATETIME     | NO   | -           | NOW()    | Fecha y hora de creación             |
| actualizado_en     | DATETIME     | NO   | -           | NOW()    | Fecha y hora de última actualización |

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (nombre_empresa)
- INDEX (nombre_empresa)

---

### 6. personal_proveedores (ProviderPersonnel)

**Descripción:** Personal de empresas proveedoras que requiere acceso a las instalaciones.

**Nombre en Base de Datos:** `personal_proveedores`

| Campo                         | Tipo         | Nulo | Clave       | Default  | Descripción                          |
| ----------------------------- | ------------ | ---- | ----------- | -------- | ------------------------------------ |
| id                            | INT          | NO   | PK, AI      | -        | Identificador único                  |
| nombre_completo               | VARCHAR(255) | NO   | -           | -        | Nombre completo del personal         |
| dni                           | VARCHAR(20)  | NO   | UNIQUE, IDX | -        | Documento Nacional de Identidad      |
| empresa                       | VARCHAR(255) | NO   | -           | -        | Empresa a la que pertenece           |
| cargo                         | VARCHAR(100) | SÍ   | -           | NULL     | Cargo en la empresa                  |
| telefono                      | VARCHAR(50)  | SÍ   | -           | NULL     | Teléfono de contacto                 |
| ruta_foto                     | VARCHAR(500) | SÍ   | -           | NULL     | Ruta de la foto                      |
| estado                        | VARCHAR(50)  | NO   | -           | "Activo" | Estado (Activo/Inactivo)             |
| hora_entrada                  | VARCHAR(5)   | SÍ   | -           | "08:00"  | Hora de inicio laboral (HH:mm)       |
| hora_salida                   | VARCHAR(5)   | SÍ   | -           | "17:45"  | Hora de fin laboral (HH:mm)          |
| fecha_hora_entrada_programada | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de entrada programada   |
| fecha_hora_salida_programada  | DATETIME     | SÍ   | IDX         | NULL     | Fecha y hora de salida programada    |
| fecha_hora_entrada_real       | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de entrada real         |
| fecha_hora_salida_real        | DATETIME     | SÍ   | -           | NULL     | Fecha y hora de salida real          |
| creado_en                     | DATETIME     | NO   | -           | NOW()    | Fecha y hora de creación             |
| actualizado_en                | DATETIME     | NO   | -           | NOW()    | Fecha y hora de última actualización |

**Relaciones:**

- Uno a Uno con `biometricos_faciales` (FaceBiometric)
- Uno a Muchos con `registros_acceso` (AccessLog)

**Índices:**

- PRIMARY KEY (id)
- UNIQUE (dni)
- INDEX (dni)
- INDEX (fecha_hora_salida_programada)

---

### 7. registros_acceso (AccessLog)

**Descripción:** Registro histórico de todos los accesos al sistema (entradas y salidas).

**Nombre en Base de Datos:** `registros_acceso`

| Campo          | Tipo         | Nulo | Clave  | Default | Descripción                                            |
| -------------- | ------------ | ---- | ------ | ------- | ------------------------------------------------------ |
| id             | INT          | NO   | PK, AI | -       | Identificador único del registro                       |
| nombre_usuario | VARCHAR(255) | NO   | -      | -       | Nombre del usuario que accedió                         |
| dni_usuario    | VARCHAR(20)  | SÍ   | IDX    | NULL    | DNI del usuario                                        |
| rol            | VARCHAR(100) | NO   | -      | -       | Rol del usuario                                        |
| estado         | VARCHAR(50)  | NO   | IDX    | -       | Estado del acceso (Aprobado/Denegado/Fuera de Horario) |
| zona           | VARCHAR(100) | NO   | -      | -       | Zona a la que se accedió                               |
| tipo           | VARCHAR(50)  | NO   | IDX    | -       | Tipo de alerta (success/warning/critical)              |
| hora_entrada   | DATETIME     | NO   | IDX    | NOW()   | Fecha y hora de entrada                                |
| hora_salida    | DATETIME     | SÍ   | -      | NULL    | Fecha y hora de salida (NULL hasta que salga)          |
| empleado_id    | INT          | SÍ   | FK     | NULL    | ID del empleado (si aplica)                            |
| transporte_id  | INT          | SÍ   | FK     | NULL    | ID del personal de transporte (si aplica)              |
| proveedor_id   | INT          | SÍ   | FK     | NULL    | ID del personal de proveedor (si aplica)               |

**Relaciones:**

- Muchos a Uno con `empleados` (Employee) - ON DELETE SET NULL
- Muchos a Uno con `personal_transporte` (TransportPersonnel) - ON DELETE SET NULL
- Muchos a Uno con `personal_proveedores` (ProviderPersonnel) - ON DELETE SET NULL

**Índices:**

- PRIMARY KEY (id)
- INDEX (hora_entrada)
- INDEX (dni_usuario)
- INDEX (estado)
- INDEX (tipo)

**Nota:** Solo uno de los campos FK (empleado_id, transporte_id, proveedor_id) debe tener valor.

---

### 8. pases_temporales (TemporaryPass)

**Descripción:** Pases temporales para visitantes o personal con acceso limitado en el tiempo.

**Nombre en Base de Datos:** `pases_temporales`

| Campo           | Tipo         | Nulo | Clave  | Default  | Descripción                                 |
| --------------- | ------------ | ---- | ------ | -------- | ------------------------------------------- |
| id              | INT          | NO   | PK, AI | -        | Identificador único del pase                |
| nombre_completo | VARCHAR(255) | NO   | -      | -        | Nombre completo del visitante               |
| dni             | VARCHAR(20)  | NO   | -      | -        | Documento Nacional de Identidad             |
| empresa         | VARCHAR(255) | SÍ   | -      | NULL     | Empresa del visitante                       |
| motivo          | TEXT         | NO   | -      | -        | Motivo de la visita                         |
| autorizado_por  | VARCHAR(255) | NO   | -      | -        | Nombre del supervisor que autorizó          |
| emitido_por_id  | INT          | SÍ   | FK     | NULL     | ID del empleado que emitió el pase          |
| valido_desde    | DATETIME     | NO   | IDX    | -        | Fecha y hora desde la cual es válido        |
| valido_hasta    | DATETIME     | NO   | IDX    | -        | Fecha y hora hasta la cual es válido        |
| estado          | VARCHAR(50)  | NO   | IDX    | "Activo" | Estado del pase (Activo/Expirado/Cancelado) |
| creado_en       | DATETIME     | NO   | -      | NOW()    | Fecha y hora de creación                    |

**Relaciones:**

- Muchos a Uno con `empleados` (Employee - emisor) - ON DELETE SET NULL

**Índices:**

- PRIMARY KEY (id)
- INDEX (valido_desde, valido_hasta)
- INDEX (estado)

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
           │                                        │
           ├────────────────────────┐               │
           │                        │               │
           │                        │               │
     1:N   ▼                  1:N   ▼               │
┌─────────────────────┐    ┌─────────────────────┐ │
│  registros_acceso   │    │  pases_temporales   │ │
│   (AccessLog)       │    │  (TemporaryPass)    │ │
└──────────┬──────────┘    └─────────────────────┘ │
           │ N:1                                    │
           │                                        │ 1:1
           │            ┌────────────────────┐      │
           └────────────┤ personal_transporte│◄─────┤
                        │ (TransportPersonnel)│      │
                        └────────────────────┘      │
                                                    │
           ┌────────────────────┐                   │
           │ empresas_proveedoras│                  │
           │ (ProviderCompany)  │                  │
           └────────────────────┘                  │
                                                   │ 1:1
                        ┌────────────────────┐     │
           └────────────┤personal_proveedores│◄────┘
                        │ (ProviderPersonnel)│
                        └────────────────────┘
```

---

## Notas Importantes

### Reglas de Negocio

1. **Datos Biométricos:** Un registro biométrico solo puede estar asociado a UNA persona (empleado, personal de transporte o personal de proveedor).

2. **Registros de Acceso:** Un registro de acceso solo puede estar vinculado a UNA fuente (empleado, transporte o proveedor).

3. **Horarios:** Los horarios de entrada y salida se almacenan en formato HH:mm (24 horas).

4. **Estados:** Los estados válidos son "Activo" e "Inactivo" para la mayoría de las entidades.

5. **Pases Temporales:** Los pases temporales deben validarse contra las fechas `valido_desde` y `valido_hasta`.

### Seguridad

- Las contraseñas se almacenan encriptadas en el campo `contrasena`.
- Los descriptores biométricos se almacenan como JSON en formato TEXT.
- Las rutas de fotos son rutas relativas al directorio de almacenamiento del sistema.

### Integridad Referencial

- **CASCADE:** Al eliminar un empleado/personal, se eliminan sus datos biométricos.
- **SET NULL:** Al eliminar un empleado/personal, sus registros de acceso y pases temporales mantienen la referencia en NULL pero conservan el historial.

---

**Última actualización:** 24 de febrero de 2026
**Versión del esquema:** 1.0
**Generado desde:** `prisma/schema.prisma`
