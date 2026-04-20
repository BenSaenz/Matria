UPDATE products SET variants_json = '[
  {"id":"amanecer-interno-vela-200","name":"Vela 200 g","presentation":"Frasco crema · 200 g","price":85,"badge":"Más elegido","isDefault":1,"active":1,"discount":{"enabled":1,"type":"percent","value":10}},
  {"id":"amanecer-interno-vela-320","name":"Vela 320 g","presentation":"Frasco vidrio ámbar · 320 g","price":112,"badge":"Mayor duración","isDefault":0,"active":1,"discount":{"enabled":1,"type":"percent","value":5}}
]' WHERE id = 'amanecer-interno';

UPDATE products SET variants_json = '[
  {"id":"abrazo-de-hogar-vela-220","name":"Vela 220 g","presentation":"Frasco piedra · 220 g","price":88,"badge":"Refugio cálido","isDefault":1,"active":1,"discount":{"enabled":1,"type":"percent","value":12}},
  {"id":"abrazo-de-hogar-vela-380","name":"Vela 380 g","presentation":"Frasco premium · 380 g","price":126,"badge":"Edición hogar","isDefault":0,"active":1,"discount":{"enabled":0,"type":"percent","value":0}}
]' WHERE id = 'abrazo-de-hogar';

UPDATE products SET variants_json = '[
  {"id":"ritual-citrico-sales-120","name":"Sales 120 g","presentation":"Frasco mate · 120 g","price":39,"badge":"Baño de pies","isDefault":1,"active":1,"discount":{"enabled":0,"type":"percent","value":0}},
  {"id":"ritual-citrico-sales-240","name":"Sales 240 g","presentation":"Bolsa refill · 240 g","price":61,"badge":"Refill","isDefault":0,"active":1,"discount":{"enabled":1,"type":"fixed","value":4}}
]' WHERE id = 'ritual-citrico';

UPDATE products SET variants_json = '[]' WHERE variants_json IS NULL;
