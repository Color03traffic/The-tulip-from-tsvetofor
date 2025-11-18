<?php

$token =8591881268:AAF4TFIaPUk-PK2KU6qHRsLwk7NsQkJecWY;
$chat_id = "857268396";

$name    = $_POST['name']    ?? '';
$phone   = $_POST['phone']   ?? '';
$order   = $_POST['order']   ?? '';
$comment = $_POST['comment'] ?? '';

$text =
"🌷 <b>НОВЫЙ ЗАКАЗ ТЮЛЬПАН03</b>\n\n" .
"👤 <b>ФИО:</b> $name\n" .
"📞 <b>Телефон:</b> $phone\n" .
"💐 <b>Заказ:</b> $order\n" .
"💬 <b>Комментарий:</b> $comment\n\n" .
"📅 <b>Время:</b> " . date('d.m.Y H:i');

$url = "https://api.telegram.org/bot$token/sendMessage";

file_get_contents($url . "?" . http_build_query([
    'chat_id' => $chat_id,
    'text' => $text,
    'parse_mode' => 'HTML'
]));

echo "Спасибо! Заявка отправлена.";
