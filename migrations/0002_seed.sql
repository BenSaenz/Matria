-- 0002_seed.sql

DELETE FROM coupons;

DELETE FROM products;

DELETE FROM collections;

INSERT INTO collections (
id, code, name, title, tagline, story, pack_name, pack_story, cta_label, featured, show_on_home, sort_order, active, media_json
) VALUES (
'alba', '01', 'ALBA', 'ALBA', 'El origen del día, la luz pura antes del caos.', 'Una colección diseñada para despejar la niebla mental de la mañana y devolverte foco, frescura y claridad.', 'Pack: El Despertar', '¿Te sientes abrumada al despertar? Recupera el control de tu jornada desde el primer rayo de luz, despejando la niebla mental.', 'Explorar ALBA', 1, 1, 1, 1, '[{"type": "image", "src": "assets/img/collections/alba/cover.svg", "alt": "Colección Alba de MATRIA", "title": "Colección ALBA", "caption": "Luz suave, enfoque y frescura para empezar el día."}]'
);

INSERT INTO collections (
id, code, name, title, tagline, story, pack_name, pack_story, cta_label, featured, show_on_home, sort_order, active, media_json
) VALUES (
'nido', '02', 'NIDO', 'NIDO', 'El útero, el espacio seguro donde uno puede ser vulnerable.', 'Una colección para volver a tu centro, sentir refugio y envolver la rutina en ternura, suavidad y contención.', 'Pack: El Abrazo', '¿El mundo exterior se siente hostil? Regresa a tu centro en un refugio de calidez que te envuelve como un abrazo eterno.', 'Explorar NIDO', 1, 1, 2, 1, '[{"type": "image", "src": "assets/img/collections/nido/cover.svg", "alt": "Colección Nido de MATRIA", "title": "Colección NIDO", "caption": "Refugio, contención y dulzura para volver a casa."}]'
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'amanecer-interno', 'alba', 'Amanecer Interno', 'Vela Pote', 'ritual', 85, 'Despeja tu mañana', '90% Osmanthus (FO) + 10% Lavanda (OE)', '¿Te cuesta arrancar el día con claridad? Esta vela disipa la “niebla mental” matutina, dándote el enfoque que necesitas para tomar el control de tu jornada.', 'Una vela para empezar el día con foco, claridad y una sensación luminosa de control.', 'Perfil floral-suave con un fondo sereno para rituales de mañana, journaling o escritorio.', '["Ideal para primeras horas del día, home office o espacios de concentración.", "Su mezcla transmite luz, aire y una pausa limpia antes del ruido cotidiano."]', '["Cera vegetal", "Mecha de algodón", "Encendido pensado para mañanas", "Envase reutilizable"]', 1, 'percent', 10, '[{"type": "image", "src": "assets/img/products/amanecer-interno/01.svg", "alt": "Vela Amanecer Interno de MATRIA", "title": "Vista principal", "caption": "Luz floral para empezar con enfoque."}, {"type": "image", "src": "assets/img/products/amanecer-interno/02.svg", "alt": "Detalle de Amanecer Interno", "title": "Detalle", "caption": "Estética editorial con tonos crema y arena."}]', 1, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'brisa-de-alba', 'alba', 'Brisa de Alba', 'Wax Melt', 'ritual', 42, 'Claridad creativa', '100% Osmanthus (FO)', '¿Sientes tu espacio de trabajo pesado? Úsalo para limpiar el ambiente y recuperar la agudeza mental durante tus horas de mayor exigencia creativa.', 'Wax melt para refrescar el ambiente y despejar la mente en sesiones creativas.', 'Piezas aromáticas de rápida difusión para renovar la energía del ambiente.', '["Funciona muy bien en estudio, escritorio o rincones de trabajo."]', '["Difusión rápida", "Fácil de usar", "Ideal para hornillo", "Aroma limpio"]', 0, 'percent', 0, '[{"type": "image", "src": "assets/img/products/brisa-de-alba/01.svg", "alt": "Wax melt Brisa de Alba", "title": "Vista principal", "caption": "Frescura aromática para volver a enfocar."}]', 2, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'rocio-matinal', 'alba', 'Rocío Matinal', 'Sachet', 'regalo', 28, 'Frescura diaria', '70% Strawberry (FO) + 30% Lavanda (OE)', '¿Tu auto o clóset se sienten encerrados? Devuélveles la frescura natural que te hace sonreír cada vez que abres una puerta.', 'Sachet aromático para clóset, auto o cajones con un gesto ligero y alegre.', 'Un pequeño objeto perfumado para espacios cerrados que necesitan aire, ternura y suavidad.', '["Pensado para rutinas cotidianas donde un detalle sensorial cambia el ánimo."]', '["Ideal para clóset o auto", "Formato compacto", "Aroma fresco", "Listo para regalo"]', 1, 'fixed', 3, '[{"type": "image", "src": "assets/img/products/rocio-matinal/01.svg", "alt": "Sachet Rocío Matinal", "title": "Vista principal", "caption": "Frescura suave para espacios pequeños."}]', 3, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'ritual-citrico', 'alba', 'Ritual Cítrico', 'Sales', 'ritual', 39, 'Baño de pies', '100% Eucalipto (OE)', '¿Agotamiento tras una mañana intensa? Un baño rápido de pies que recarga tus baterías cuando sientes que ya no puedes más.', 'Sales para tina o baño de pies con una energía verde y despejante.', 'Un ritual sencillo para cortar la fatiga, respirar mejor y reiniciar el cuerpo.', '["Perfecto para media mañana o cierre de jornada exigente."]', '["Uso corporal", "Notas herbales", "Sensación refrescante", "Textura mineral"]', 0, 'percent', 0, '[{"type": "image", "src": "assets/img/products/ritual-citrico/01.svg", "alt": "Sales Ritual Cítrico", "title": "Vista principal", "caption": "Limpieza suave y recuperación rápida."}]', 4, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'abrazo-de-hogar', 'nido', 'Abrazo de Hogar', 'Vela Pote', 'ritual', 88, 'Refugio cálido', '100% Almond & Vanilla (FO)', '¿Necesitas sentirte segura y en calma? Crea al instante un refugio cálido que te haga sentir protegida del caos exterior, como un abrazo que no termina.', 'Una vela envolvente para crear refugio, calma y una sensación de hogar emocional.', 'Notas cremosas y suaves para tardes lentas, descanso emocional y espacios de contención.', '["Diseñada para dormitorios, salas íntimas y momentos de vulnerabilidad."]', '["Cera vegetal", "Perfil cálido", "Encendido lento", "Envase reutilizable"]', 1, 'percent', 12, '[{"type": "image", "src": "assets/img/products/abrazo-de-hogar/01.svg", "alt": "Vela Abrazo de Hogar", "title": "Vista principal", "caption": "Calidez serena con notas cremosas."}, {"type": "image", "src": "assets/img/products/abrazo-de-hogar/02.svg", "alt": "Detalle de Abrazo de Hogar", "title": "Detalle", "caption": "Atmósfera de refugio y suavidad."}]', 5, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'dulce-pausa', 'nido', 'Dulce Pausa', 'Wax Melt', 'ritual', 44, 'Suaviza el ambiente', '100% Coconut & Vanilla (FO)', '¿Día difícil? Disuelve una pieza para suavizar el ambiente y bajar tus revoluciones después de un día de estrés o ansiedad.', 'Wax melt reconfortante con una dulzura suave y cremosa para bajar las revoluciones.', 'Ideal para tardes de regreso a casa o momentos en los que quieres sentir cobijo sin esfuerzo.', '["Se siente amable, envolvente y muy fácil de integrar a la rutina."]', '["Difusión rápida", "Textura cremosa", "Uso sencillo", "Ideal al volver a casa"]', 0, 'percent', 0, '[{"type": "image", "src": "assets/img/products/dulce-pausa/01.svg", "alt": "Wax melt Dulce Pausa", "title": "Vista principal", "caption": "Dulzura sensorial para un final de día más amable."}]', 6, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'velo-de-seda', 'nido', 'Velo de Seda', 'Sachet', 'regalo', 30, 'Textil perfumado', '100% Vanilla & Coconut (FO)', '¿Tu ropa ha perdido ese olor a limpio? Mantén esa sensación de hogar y suavidad en tus prendas favoritas por mucho más tiempo.', 'Sachet para ropa y textiles con aroma limpio, suave y acogedor.', 'Acompaña cajones, prendas favoritas o ropa de cama con una sensación de casa bien cuidada.', '["Perfecto para gifting delicado o detalles de closet."]', '["Para ropa o textiles", "Formato ligero", "Aroma suave", "Uso diario"]', 1, 'fixed', 4, '[{"type": "image", "src": "assets/img/products/velo-de-seda/01.svg", "alt": "Sachet Velo de Seda", "title": "Vista principal", "caption": "Suavidad y aroma limpio para textiles."}]', 7, 1
);

INSERT INTO products (
id, collection_id, name, category, format, price, badge, technical_blend, sales_speech, short_description, description, descriptions_json, features_json, discount_enabled, discount_type, discount_value, media_json, sort_order, active
) VALUES (
'manto-de-flores', 'nido', 'Manto de Flores', 'Sales', 'ritual', 41, 'Ritual de ternura', '100% Vainilla (FO)', '¿Sientes tu piel y ánimo descuidados? Un ritual de ternura pura para recordarte que tú también mereces ser atendida y mimada.', 'Sales de baño con una sensación dulce y envolvente para rituales de ternura.', 'Acompañan baños reparadores y pausas profundas con una presencia suave y femenina/unisex.', '["Pensadas para cerrar el día con más amor propio y menos ruido."]', '["Uso corporal", "Perfil dulce", "Ideal para noche", "Textura mineral"]', 0, 'percent', 0, '[{"type": "image", "src": "assets/img/products/manto-de-flores/01.svg", "alt": "Sales Manto de Flores", "title": "Vista principal", "caption": "Contención sensorial para cuerpo y ánimo."}]', 8, 1
);

INSERT INTO coupons (
id, code, type, value, min_order, description, active
) VALUES (
'calma10', 'CALMA10', 'percent', 10, 80, 'Bienvenida para primeras compras', 1
);

INSERT INTO coupons (
id, code, type, value, min_order, description, active
) VALUES (
'ritual20', 'RITUAL20', 'fixed', 20, 150, 'Descuento fijo para tickets altos', 1
);

INSERT OR REPLACE INTO meta (key, value, updated_at)
VALUES (
  'store_revision',
  '{"id":"seed-0002","resource":"seed","at":"2026-04-04T00:00:00.000Z"}',
  CURRENT_TIMESTAMP
);