import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class HeadGuard implements CanActivate {
    constructor(private router: Router) { }

    canActivate(): boolean {
        const token = localStorage.getItem('token');
        if (!token) {
            this.router.navigate(['/login']);
            return false;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.head === true) {
                return true;
            } else {
                this.router.navigate(['/dashboard']);
                return false;
            }
        } catch {
            this.router.navigate(['/login']);
            return false;
        }
    }
}