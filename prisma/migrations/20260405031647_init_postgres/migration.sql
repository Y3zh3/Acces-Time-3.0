-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'SEGURIDAD');

-- CreateTable
CREATE TABLE "usuarios_sistema" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "email" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'EMPLEADO',
    "cargo" TEXT,
    "departamento" TEXT NOT NULL,
    "sede" TEXT,
    "vencimiento_contrato" TIMESTAMP(3),
    "email" TEXT,
    "ruta_foto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "tiene_biometrico" BOOLEAN NOT NULL DEFAULT false,
    "hora_entrada" TEXT DEFAULT '08:00',
    "hora_salida" TEXT DEFAULT '17:45',
    "fecha_hora_entrada" TIMESTAMP(3),
    "fecha_hora_salida" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometricos_faciales" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER,
    "personal_transporte_id" INTEGER,
    "personal_proveedor_id" INTEGER,
    "descriptor" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometricos_faciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_transporte" (
    "id" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "vehiculo" TEXT,
    "matricula" TEXT,
    "ruta_foto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "hora_entrada" TEXT DEFAULT '08:00',
    "hora_salida" TEXT DEFAULT '17:45',
    "fecha_hora_entrada_programada" TIMESTAMP(3),
    "fecha_hora_salida_programada" TIMESTAMP(3),
    "fecha_hora_entrada_real" TIMESTAMP(3),
    "fecha_hora_salida_real" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_transporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_proveedoras" (
    "id" SERIAL NOT NULL,
    "nombre_empresa" TEXT NOT NULL,
    "ruc" TEXT,
    "tipo_suministro" TEXT,
    "contacto_comercial" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_proveedoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_proveedores" (
    "id" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "ruta_foto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "hora_entrada" TEXT DEFAULT '08:00',
    "hora_salida" TEXT DEFAULT '17:45',
    "fecha_hora_entrada_programada" TIMESTAMP(3),
    "fecha_hora_salida_programada" TIMESTAMP(3),
    "fecha_hora_entrada_real" TIMESTAMP(3),
    "fecha_hora_salida_real" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_acceso" (
    "id" SERIAL NOT NULL,
    "nombre_usuario" TEXT NOT NULL,
    "dni_usuario" TEXT,
    "rol" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "hora_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_salida" TIMESTAMP(3),
    "empleado_id" INTEGER,
    "transporte_id" INTEGER,
    "proveedor_id" INTEGER,

    CONSTRAINT "registros_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pases_temporales" (
    "id" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "empresa" TEXT,
    "motivo" TEXT NOT NULL,
    "autorizado_por" TEXT NOT NULL,
    "emitido_por_id" INTEGER,
    "valido_desde" TIMESTAMP(3) NOT NULL,
    "valido_hasta" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pases_temporales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_sistema_usuario_key" ON "usuarios_sistema"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_dni_key" ON "empleados"("dni");

-- CreateIndex
CREATE INDEX "empleados_dni_idx" ON "empleados"("dni");

-- CreateIndex
CREATE INDEX "empleados_estado_idx" ON "empleados"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "biometricos_faciales_empleado_id_key" ON "biometricos_faciales"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "biometricos_faciales_personal_transporte_id_key" ON "biometricos_faciales"("personal_transporte_id");

-- CreateIndex
CREATE UNIQUE INDEX "biometricos_faciales_personal_proveedor_id_key" ON "biometricos_faciales"("personal_proveedor_id");

-- CreateIndex
CREATE INDEX "biometricos_faciales_activo_idx" ON "biometricos_faciales"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "personal_transporte_dni_key" ON "personal_transporte"("dni");

-- CreateIndex
CREATE INDEX "personal_transporte_dni_idx" ON "personal_transporte"("dni");

-- CreateIndex
CREATE INDEX "personal_transporte_fecha_hora_salida_programada_idx" ON "personal_transporte"("fecha_hora_salida_programada");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_proveedoras_nombre_empresa_key" ON "empresas_proveedoras"("nombre_empresa");

-- CreateIndex
CREATE INDEX "empresas_proveedoras_nombre_empresa_idx" ON "empresas_proveedoras"("nombre_empresa");

-- CreateIndex
CREATE UNIQUE INDEX "personal_proveedores_dni_key" ON "personal_proveedores"("dni");

-- CreateIndex
CREATE INDEX "personal_proveedores_dni_idx" ON "personal_proveedores"("dni");

-- CreateIndex
CREATE INDEX "personal_proveedores_fecha_hora_salida_programada_idx" ON "personal_proveedores"("fecha_hora_salida_programada");

-- CreateIndex
CREATE INDEX "registros_acceso_hora_entrada_idx" ON "registros_acceso"("hora_entrada");

-- CreateIndex
CREATE INDEX "registros_acceso_dni_usuario_idx" ON "registros_acceso"("dni_usuario");

-- CreateIndex
CREATE INDEX "registros_acceso_estado_idx" ON "registros_acceso"("estado");

-- CreateIndex
CREATE INDEX "registros_acceso_tipo_idx" ON "registros_acceso"("tipo");

-- CreateIndex
CREATE INDEX "pases_temporales_valido_desde_valido_hasta_idx" ON "pases_temporales"("valido_desde", "valido_hasta");

-- CreateIndex
CREATE INDEX "pases_temporales_estado_idx" ON "pases_temporales"("estado");

-- AddForeignKey
ALTER TABLE "biometricos_faciales" ADD CONSTRAINT "biometricos_faciales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometricos_faciales" ADD CONSTRAINT "biometricos_faciales_personal_transporte_id_fkey" FOREIGN KEY ("personal_transporte_id") REFERENCES "personal_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometricos_faciales" ADD CONSTRAINT "biometricos_faciales_personal_proveedor_id_fkey" FOREIGN KEY ("personal_proveedor_id") REFERENCES "personal_proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_acceso" ADD CONSTRAINT "registros_acceso_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_acceso" ADD CONSTRAINT "registros_acceso_transporte_id_fkey" FOREIGN KEY ("transporte_id") REFERENCES "personal_transporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_acceso" ADD CONSTRAINT "registros_acceso_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "personal_proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pases_temporales" ADD CONSTRAINT "pases_temporales_emitido_por_id_fkey" FOREIGN KEY ("emitido_por_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
