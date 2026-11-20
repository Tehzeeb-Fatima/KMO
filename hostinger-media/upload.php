<?php
// KMO media upload / delete endpoint on media.karachimartonline.com.
//
// Only a signed-in KMO admin or vendor can write, and only where Supabase's
// public.can_write_media() allows (a vendor: their own products and store).
// Files go into a bucket folder whose .htaccess blocks running any script.

declare(strict_types=1);

const SUPABASE_URL = 'https://igjrtfgnlvepemdehbdn.supabase.co';
const MEDIA_BASE = 'https://media.karachimartonline.com';
const BUCKETS = ['product-media', 'vendor-media', 'category-media', 'promotion-media'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const VIDEO_EXT = ['mp4', 'webm', 'mov'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_ORIGINS = [
    'https://admin.karachimartonline.com',
    'https://vendor.karachimartonline.com',
    'https://karachimartonline.com',
    'https://kmo-admin.vercel.app',
    'https://kmo-vendor.vercel.app',
];

// The publishable key is public (it ships in every page); access is decided by
// the uploader's own login token, never by this key.
$publishableKey = trim((string) @file_get_contents(dirname(__DIR__, 2) . '/.kmo-media-key'));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true) || preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['error' => 'Method not allowed']);
if ($publishableKey === '') reply(500, ['error' => 'Upload is not configured.']);

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/', $auth, $m)) reply(401, ['error' => 'Please sign in again.']);
$token = $m[1];

$action = $_POST['action'] ?? 'upload';
$bucket = $_POST['bucket'] ?? '';
$path = $_POST['path'] ?? '';

if (!in_array($bucket, BUCKETS, true)) reply(400, ['error' => 'Unknown folder.']);
// folder/file or file; letters, numbers, dot, dash, underscore; no hidden files or "..".
if (!preg_match('#^(?:[A-Za-z0-9_-]{1,64}/)?[A-Za-z0-9_-][A-Za-z0-9._-]{0,119}$#', $path) || str_contains($path, '..')) {
    reply(400, ['error' => 'Invalid file name.']);
}
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$isImage = in_array($ext, IMAGE_EXT, true);
$isVideo = in_array($ext, VIDEO_EXT, true);
if (!$isImage && !$isVideo) reply(400, ['error' => 'Only images (jpg, png, webp, gif, avif) and videos (mp4, webm, mov) are allowed.']);

// Ask Supabase, as this user, whether they may write here.
$ch = curl_init(SUPABASE_URL . '/rest/v1/rpc/can_write_media');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'apikey: ' . $publishableKey,
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode(['p_bucket' => $bucket, 'p_path' => $path]),
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($code === 401) reply(401, ['error' => 'Please sign in again.']);
if ($code !== 200 || trim((string) $res) !== 'true') reply(403, ['error' => "You don't have permission to change this file."]);

$target = __DIR__ . '/' . $bucket . '/' . $path;

if ($action === 'delete') {
    if (is_file($target)) unlink($target);
    reply(200, ['ok' => true]);
}
if ($action !== 'upload') reply(400, ['error' => 'Unknown action.']);

$file = $_FILES['file'] ?? null;
if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
    reply(400, ['error' => 'The file did not arrive. Please try again.']);
}
$size = (int) $file['size'];
if ($isImage && $size > MAX_IMAGE_BYTES) reply(400, ['error' => 'Images must be under 10 MB.']);
if ($isVideo && $size > MAX_VIDEO_BYTES) reply(400, ['error' => 'Videos must be under 50 MB.']);

// Check what the file really is, not just its name.
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
if ($isImage && (!str_starts_with($mime, 'image/') || $mime === 'image/svg+xml' || @getimagesize($file['tmp_name']) === false)) {
    reply(400, ['error' => 'That file is not a valid image.']);
}
if ($isVideo && !str_starts_with($mime, 'video/') && $mime !== 'application/octet-stream') {
    reply(400, ['error' => 'That file is not a valid video.']);
}
$head = (string) file_get_contents($file['tmp_name'], false, null, 0, 4096);
if (stripos($head, '<?php') !== false || stripos($head, '<script') !== false) reply(400, ['error' => 'That file is not allowed.']);

$dir = dirname($target);
if (!is_dir($dir) && !mkdir($dir, 0755, true)) reply(500, ['error' => 'Could not save the file.']);
if (!move_uploaded_file($file['tmp_name'], $target)) reply(500, ['error' => 'Could not save the file.']);
chmod($target, 0644);

reply(200, ['url' => MEDIA_BASE . '/' . $bucket . '/' . $path]);
