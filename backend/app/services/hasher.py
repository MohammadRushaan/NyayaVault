import io
import hashlib
from PIL import Image

def compute_sha256(data: bytes) -> str:
    """Computes standard hexadecimal SHA-256 digest of input bytes."""
    return hashlib.sha256(data).hexdigest()

def calculate_dhash(image_bytes: bytes, hash_size: int = 8) -> int:
    """Computes a difference perceptual hash (dHash) for visual integrity verification."""
    image = Image.open(io.BytesIO(image_bytes)).convert('L').resize(
        (hash_size + 1, hash_size), 
        Image.Resampling.LANCZOS
    )
    pixels = list(image.getdata())
    difference = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            difference.append(pixel_left > pixel_right)
            
    decimal_value = 0
    for index, val in enumerate(difference):
        if val:
            decimal_value += 2 ** index
    return decimal_value

def compare_visual_integrity(raw_benchmark: bytes, raw_presented: bytes) -> dict:
    """Returns exact cryptographic match, perceptual Hamming distance, and structural match status."""
    raw_match = (compute_sha256(raw_benchmark) == compute_sha256(raw_presented))
    if raw_match:
        return {
            "exact_byte_match": True, 
            "visual_similarity_score": 100.0, 
            "status": "PRISTINE"
        }

    try:
        h1 = calculate_dhash(raw_benchmark)
        h2 = calculate_dhash(raw_presented)
        # Compute Hamming distance
        distance = bin(h1 ^ h2).count('1')
        similarity = max(0.0, (1.0 - (distance / 64.0)) * 100.0)
        return {
            "exact_byte_match": False,
            "visual_similarity_score": round(similarity, 2),
            "hamming_distance": distance,
            "status": "COMPRESSED_MATCH" if similarity >= 90.0 else "TAMPERED_OR_DIFFERENT"
        }
    except Exception:
        return {
            "exact_byte_match": False, 
            "visual_similarity_score": 0.0, 
            "status": "TAMPERED"
        }