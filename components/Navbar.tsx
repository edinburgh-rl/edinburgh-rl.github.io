"use client"

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
    const [isActive, setIsActive] = useState(false);
    return (
        <nav
            className="navbar has-background-primary is-fixed-top"
            role="navigation"
            aria-label="navigation"
        >
            <div className="navbar-brand">
                <Link className="navbar-item p-0 no-hover" href={"/"}>
                    <img src="logo.png" width={150}></img>
                </Link>
                <a
                    role="button"
                    className={`navbar-burger ${isActive ? 'is-active' : ""} navbar-burger-no-margin`}
                    aria-label="menu"
                    aria-expanded="false"
                    data-target="navbarBasicExample"
                    onClick={e => {
                        e.preventDefault();
                        setIsActive(!isActive);
                    }}
                >
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                </a>
            </div>
            <div
                className={`navbar-menu ${isActive ? "is-active" : ""}`}
            >
                <div className="navbar-end">
                    <Link className="navbar-item" href={"/"}>Home</Link>
                    <Link className="navbar-item" href={"/people"}>People</Link>
                    <Link className="navbar-item" href={"/reading-group"}>Reading Group</Link>
                </div>
            </div>
        </nav>
    )
}