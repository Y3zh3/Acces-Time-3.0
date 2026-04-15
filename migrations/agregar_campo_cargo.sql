-- Agregar columna cargo para guardar el cargo original del empleado
ALTER TABLE empleados ADD COLUMN cargo VARCHAR(100) NULL AFTER departamento;

-- Comentario: Este campo guardará el cargo específico del empleado
-- (ASISTENTE_ADMIN, OPERARIO_ALMACEN, MONTACARGUISTA, etc.)
-- mientras que el campo 'rol' mantiene el rol del sistema para permisos
