"""
Compatibilidad con las contraseñas del prototipo.

El prototipo guardaba: pbkdf2$<iteraciones>$<sal en hex>$<hash en hex> (PBKDF2-SHA256).
Django usa otro formato (pbkdf2_sha256$...), así que este hasher solo sabe VERIFICAR
el formato viejo. Como no es el hasher preferido, Django vuelve a guardar la
contraseña con su propio formato la primera vez que el usuario inicia sesión.
"""
import hashlib
import hmac

from django.contrib.auth.hashers import BasePasswordHasher


class PrototipoPBKDF2Hasher(BasePasswordHasher):
    algorithm = "pbkdf2"

    def verify(self, password, encoded):
        try:
            algoritmo, iteraciones, sal, esperado = encoded.split("$")
            calculado = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), bytes.fromhex(sal), int(iteraciones)
            ).hex()
        except ValueError:
            return False
        return algoritmo == self.algorithm and hmac.compare_digest(calculado, esperado)

    def encode(self, password, salt):
        raise NotImplementedError("Solo se usa para verificar contraseñas antiguas del prototipo.")

    def decode(self, encoded):
        algoritmo, iteraciones, sal, hash_ = encoded.split("$")
        return {"algorithm": algoritmo, "iterations": int(iteraciones), "salt": sal, "hash": hash_}

    def safe_summary(self, encoded):
        d = self.decode(encoded)
        return {"algoritmo": d["algorithm"], "iteraciones": d["iterations"], "sal": d["salt"][:6] + "…"}

    def must_update(self, encoded):
        return True

    def harden_runtime(self, password, encoded):
        pass
